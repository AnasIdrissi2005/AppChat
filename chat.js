import { auth, db } from "./firebase-init.js";
import { initTypingManager } from "./typing.js";
import { createReadsManager } from "./reads.js";
import { uploadChatImage } from "./storage.js";
import {
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const ROOM_ID = "global";
const isMobile = window.matchMedia("(max-width: 900px) and (pointer: coarse)").matches;

const chatBox = document.getElementById("chat-box");
const messageInput = document.getElementById("message-input");
const sendButton = document.getElementById("send-button");
const logoutButton = document.getElementById("logout-button");
const attachImageButton = document.getElementById("attach-image-button");
const imageInput = document.getElementById("image-input");
const imagePreview = document.getElementById("image-preview");
const imagePreviewImg = document.getElementById("image-preview-img");
const cancelImageButton = document.getElementById("cancel-image-button");
const uploadProgressEl = document.getElementById("upload-progress");
const typingIndicator = document.getElementById("typing-indicator");

const messagesQuery = query(
  collection(db, "messages"),
  where("roomId", "==", ROOM_ID),
  orderBy("createdAt", "asc"),
  limit(150)
);

const usersMap = new Map();
const pendingMap = new Map();
let selectedImageFile = null;
let typingManager = null;
let readsManager = null;
let readsMap = new Map();
let renderedMessages = [];

function getInitials(nameOrEmail = "?") {
  const text = (nameOrEmail || "?").trim();
  if (!text) return "؟";
  const parts = text.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
  return `${parts[0].slice(0, 1)}${parts[1].slice(0, 1)}`.toUpperCase();
}

function autoResizeTextarea() {
  messageInput.style.height = "auto";
  messageInput.style.height = `${Math.min(messageInput.scrollHeight, 120)}px`;
}

function setImagePreview(file) {
  selectedImageFile = file;
  if (!file) {
    imagePreview.classList.add("hidden");
    imagePreviewImg.src = "";
    uploadProgressEl.textContent = "";
    return;
  }

  imagePreviewImg.src = URL.createObjectURL(file);
  imagePreview.classList.remove("hidden");
}

function createAvatar(data) {
  const avatarWrap = document.createElement("div");
  avatarWrap.className = "avatar";

  const photoURL = data.photoURL || usersMap.get(data.uid)?.photoURL;
  if (photoURL) {
    const img = document.createElement("img");
    img.src = photoURL;
    img.alt = data.displayName || "avatar";
    avatarWrap.appendChild(img);
  } else {
    avatarWrap.textContent = getInitials(data.displayName || data.uid || "?");
  }

  return avatarWrap;
}

function createStatusRow(msg) {
  const meta = document.createElement("div");
  meta.className = "timestamp";

  const created = msg.createdAt?.toDate ? msg.createdAt.toDate().toLocaleTimeString() : "";
  const editedLabel = msg.editedAt ? " • تم التعديل" : "";
  meta.textContent = `${created}${editedLabel}`;

  return meta;
}

function createBubbleContent(messageId, msg, isMine) {
  const bubble = document.createElement("div");
  bubble.className = `message ${isMine ? "sent" : "received"}`;
  bubble.dataset.id = messageId;
  bubble.dataset.uid = msg.uid || "";

  const header = document.createElement("div");
  header.className = "message-header";

  const sender = document.createElement("div");
  sender.className = "sender-name";
  sender.textContent = msg.displayName || usersMap.get(msg.uid)?.displayName || "Unknown";
  header.appendChild(sender);

  if (isMine) {
    const actions = document.createElement("div");
    actions.className = "message-actions";

    const editBtn = document.createElement("button");
    editBtn.type = "button";
    editBtn.className = "action-btn";
    editBtn.textContent = "✏️";
    editBtn.dataset.action = "edit";
    editBtn.setAttribute("aria-label", "تعديل الرسالة");

    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.className = "action-btn";
    deleteBtn.textContent = "🗑";
    deleteBtn.dataset.action = "delete";
    deleteBtn.setAttribute("aria-label", "حذف الرسالة");

    actions.append(editBtn, deleteBtn);
    header.appendChild(actions);
  }

  bubble.appendChild(header);

  if (msg.text) {
    const textEl = document.createElement("div");
    textEl.className = "message-text";
    textEl.textContent = msg.text;
    bubble.appendChild(textEl);
  }

  if (msg.imageUrl) {
    const link = document.createElement("a");
    link.href = msg.imageUrl;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.className = "message-image-link";

    const img = document.createElement("img");
    img.src = msg.imageUrl;
    img.alt = "image";
    img.className = "message-image";

    link.appendChild(img);
    bubble.appendChild(link);
  }

  bubble.appendChild(createStatusRow(msg));

  const readStatus = document.createElement("div");
  readStatus.className = "read-status";
  bubble.appendChild(readStatus);

  return bubble;
}

function renderPendingBubble(localId, payload) {
  const row = document.createElement("div");
  row.className = "message-row mine pending-row";
  row.dataset.localId = localId;

  const avatar = createAvatar({ uid: auth.currentUser?.uid, displayName: auth.currentUser?.displayName, photoURL: auth.currentUser?.photoURL });
  const bubble = document.createElement("div");
  bubble.className = "message sent pending";

  const textEl = document.createElement("div");
  textEl.className = "message-text";
  textEl.textContent = payload.text || "";
  if (payload.text) bubble.appendChild(textEl);

  if (payload.imageFile) {
    const tempImg = document.createElement("img");
    tempImg.src = URL.createObjectURL(payload.imageFile);
    tempImg.className = "message-image";
    bubble.appendChild(tempImg);
  }

  const pendingLabel = document.createElement("div");
  pendingLabel.className = "pending-label";
  pendingLabel.textContent = payload.uploading ? "جاري رفع الصورة..." : "جاري الإرسال…";
  bubble.appendChild(pendingLabel);

  row.append(avatar, bubble);
  chatBox.appendChild(row);
  chatBox.scrollTop = chatBox.scrollHeight;
}

function markPendingFailed(localId) {
  const row = chatBox.querySelector(`.pending-row[data-local-id="${localId}"]`);
  if (!row) return;

  const bubble = row.querySelector(".message");
  bubble.classList.add("failed");

  let label = bubble.querySelector(".pending-label");
  if (!label) {
    label = document.createElement("div");
    label.className = "pending-label";
    bubble.appendChild(label);
  }
  label.textContent = "فشل الإرسال - أعد المحاولة";

  if (!bubble.querySelector("button[data-action='retry']")) {
    const retryBtn = document.createElement("button");
    retryBtn.type = "button";
    retryBtn.className = "retry-btn";
    retryBtn.dataset.action = "retry";
    retryBtn.dataset.localId = localId;
    retryBtn.textContent = "إعادة المحاولة";
    bubble.appendChild(retryBtn);
  }
}

function removePending(localId) {
  const row = chatBox.querySelector(`.pending-row[data-local-id="${localId}"]`);
  if (row) row.remove();
  pendingMap.delete(localId);
}

function renderMessages(messages, currentUid) {
  renderedMessages = messages;
  chatBox.innerHTML = "";

  messages.forEach((msg) => {
    const isMine = msg.uid === currentUid;
    const row = document.createElement("div");
    row.className = `message-row ${isMine ? "mine" : "other"}`;

    const avatar = createAvatar(msg);
    const bubble = createBubbleContent(msg.id, msg, isMine);

    row.append(avatar, bubble);
    chatBox.appendChild(row);
  });

  pendingMap.forEach((pending, localId) => renderPendingBubble(localId, pending));
  chatBox.scrollTop = chatBox.scrollHeight;
  updateSeenStatus(currentUid);
}

function updateSeenStatus(currentUid) {
  document.querySelectorAll(".read-status").forEach((el) => (el.textContent = ""));
  const myMessages = renderedMessages.filter((msg) => msg.uid === currentUid);
  if (!myMessages.length) return;

  const lastMine = myMessages[myMessages.length - 1];
  const indexMap = new Map(renderedMessages.map((msg, idx) => [msg.id, idx]));
  const lastMineIndex = indexMap.get(lastMine.id);

  const seenBy = [];
  readsMap.forEach((read) => {
    if (!read || read.uid === currentUid) return;
    const seenIndex = indexMap.get(read.lastSeenMessageId);
    if (seenIndex !== undefined && seenIndex >= lastMineIndex) {
      seenBy.push(read.displayName || "مستخدم");
    }
  });

  const lastEl = chatBox.querySelector(`.message[data-id="${lastMine.id}"] .read-status`);
  if (!lastEl) return;

  if (!seenBy.length) {
    lastEl.textContent = "تم الإرسال";
  } else if (seenBy.length <= 2) {
    lastEl.textContent = `شوهد بواسطة ${seenBy.join("، ")}`;
  } else {
    lastEl.textContent = "شوهد";
  }
}

function openEdit(messageEl) {
  if (messageEl.classList.contains("editing")) return;
  const textEl = messageEl.querySelector(".message-text");
  if (!textEl) return;

  messageEl.classList.add("editing");

  const editWrap = document.createElement("div");
  editWrap.className = "edit-wrap";

  const editInput = document.createElement("textarea");
  editInput.className = "edit-input";
  editInput.rows = 2;
  editInput.value = textEl.textContent;

  const saveBtn = document.createElement("button");
  saveBtn.type = "button";
  saveBtn.className = "edit-btn save";
  saveBtn.dataset.action = "save-edit";
  saveBtn.textContent = "حفظ";

  const cancelBtn = document.createElement("button");
  cancelBtn.type = "button";
  cancelBtn.className = "edit-btn cancel";
  cancelBtn.dataset.action = "cancel-edit";
  cancelBtn.textContent = "إلغاء";

  editWrap.append(editInput, saveBtn, cancelBtn);
  textEl.style.display = "none";
  textEl.insertAdjacentElement("afterend", editWrap);
  editInput.focus();
}

function cancelEdit(messageEl) {
  messageEl.classList.remove("editing");
  const textEl = messageEl.querySelector(".message-text");
  if (textEl) textEl.style.display = "";
  messageEl.querySelector(".edit-wrap")?.remove();
}

async function sendMessagePayload(payload, existingLocalId = null) {
  const user = auth.currentUser;
  if (!user) return;

  const localId = existingLocalId || `local_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  pendingMap.set(localId, payload);
  if (!existingLocalId) renderPendingBubble(localId, payload);

  try {
    let imageData = null;
    if (payload.imageFile) {
      pendingMap.get(localId).uploading = true;
      const pendingLabel = chatBox.querySelector(`.pending-row[data-local-id="${localId}"] .pending-label`);
      if (pendingLabel) pendingLabel.textContent = "جاري رفع الصورة...";

      imageData = await uploadChatImage({
        file: payload.imageFile,
        roomId: ROOM_ID,
        uid: user.uid,
        onProgress: (progress) => {
          const label = chatBox.querySelector(`.pending-row[data-local-id="${localId}"] .pending-label`);
          if (label) label.textContent = `جاري رفع الصورة... ${progress}%`;
          uploadProgressEl.textContent = `رفع الصورة: ${progress}%`;
        },
      });
    }

    await addDoc(collection(db, "messages"), {
      roomId: ROOM_ID,
      type: imageData ? "image" : "text",
      text: payload.text || "",
      imageUrl: imageData?.imageUrl || "",
      imagePath: imageData?.imagePath || "",
      uid: user.uid,
      displayName: user.displayName || user.email,
      photoURL: user.photoURL || "",
      createdAt: serverTimestamp(),
    });

    removePending(localId);
    uploadProgressEl.textContent = "";
    if (!existingLocalId) {
      messageInput.value = "";
      autoResizeTextarea();
      setImagePreview(null);
      imageInput.value = "";
    }
  } catch (error) {
    console.error(error);
    markPendingFailed(localId);
    uploadProgressEl.textContent = "";
  }
}

async function sendCurrentMessage() {
  const text = messageInput.value.trim();
  if (!text && !selectedImageFile) return;

  const payload = {
    text,
    imageFile: selectedImageFile,
  };

  await sendMessagePayload(payload);
}

chatBox.addEventListener("click", async (event) => {
  const target = event.target.closest("button[data-action]");
  if (!target) return;

  if (target.dataset.action === "retry") {
    const localId = target.dataset.localId;
    const payload = pendingMap.get(localId);
    if (!payload) return;
    await sendMessagePayload(payload, localId);
    return;
  }

  const messageEl = event.target.closest(".message");
  if (!messageEl) return;

  const currentUid = auth.currentUser?.uid;
  if (!currentUid || messageEl.dataset.uid !== currentUid) return;

  if (target.dataset.action === "edit") {
    openEdit(messageEl);
    return;
  }

  if (target.dataset.action === "cancel-edit") {
    cancelEdit(messageEl);
    return;
  }

  if (target.dataset.action === "save-edit") {
    const newText = messageEl.querySelector(".edit-input")?.value.trim();
    const id = messageEl.dataset.id;
    if (!id || !newText) return;

    await updateDoc(doc(db, "messages", id), {
      text: newText,
      editedAt: serverTimestamp(),
    });
    cancelEdit(messageEl);
    return;
  }

  if (target.dataset.action === "delete") {
    const id = messageEl.dataset.id;
    if (!id) return;
    if (!window.confirm("هل تريد حذف هذه الرسالة؟")) return;
    await deleteDoc(doc(db, "messages", id));
  }
});

sendButton.addEventListener("click", sendCurrentMessage);
messageInput.addEventListener("input", autoResizeTextarea);
messageInput.addEventListener("keydown", (e) => {
  if (isMobile) return;
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendCurrentMessage();
  }
});

attachImageButton.addEventListener("click", () => imageInput.click());
imageInput.addEventListener("change", (e) => {
  const file = e.target.files?.[0];
  if (!file) return;
  setImagePreview(file);
});
cancelImageButton.addEventListener("click", () => {
  setImagePreview(null);
  imageInput.value = "";
});

logoutButton.addEventListener("click", async () => {
  if (typingManager) typingManager.stopTyping();
  await signOut(auth);
  window.location.href = "pagelogin.html";
});

window.addEventListener("beforeunload", () => {
  if (typingManager) typingManager.stopTyping();
});

onAuthStateChanged(auth, (user) => {
  if (!user) {
    window.location.href = "pagelogin.html";
    return;
  }

  onSnapshot(collection(db, "users"), (snap) => {
    usersMap.clear();
    snap.forEach((userDoc) => usersMap.set(userDoc.id, userDoc.data()));
  });

  typingManager?.cleanup();
  typingManager = initTypingManager({
    db,
    auth,
    roomId: ROOM_ID,
    inputEl: messageInput,
    indicatorEl: typingIndicator,
  });

  readsManager?.cleanup();
  readsManager = createReadsManager({
    db,
    auth,
    roomId: ROOM_ID,
    chatBox,
    getLatestMessageId: () => renderedMessages[renderedMessages.length - 1]?.id || "",
    onReadsChange: (nextReadsMap) => {
      readsMap = nextReadsMap;
      updateSeenStatus(user.uid);
    },
  });

  onSnapshot(messagesQuery, (snap) => {
    const messages = [];
    snap.forEach((messageDoc) => {
      const data = messageDoc.data();
      messages.push({ ...data, id: messageDoc.id });
    });
    renderMessages(messages, user.uid);
    readsManager.maybeMarkSeen(true);
  });
});
