import { auth, db } from "./firebase-init.js";
import { initTypingManager } from "./typing.js";
import { createReadsManager } from "./reads.js";
import { onAuthStateChanged, signInAnonymously, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  limitToLast,
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
const typingIndicator = document.getElementById("typing-indicator");
const chatContainer = document.querySelector(".chat-container");

const usersMap = new Map();
const pendingMap = new Map();
let typingManager = null;
let readsManager = null;
let readsMap = new Map();
let renderedMessages = [];
let unsubUsers = null;
let unsubMessages = null;
let activeUid = null;

function showErrorBanner() {
  let banner = document.getElementById("chat-error-banner");
  if (!banner) {
    banner = document.createElement("div");
    banner.id = "chat-error-banner";
    banner.className = "chat-error-banner";
    banner.textContent = "Connection/permission error";
    chatContainer?.prepend(banner);
  }
  banner.style.display = "block";
}

function hideErrorBanner() {
  const banner = document.getElementById("chat-error-banner");
  if (banner) banner.style.display = "none";
}

function logFirebaseError(context, error) {
  const code = error?.code || "unknown";
  if (code === "permission-denied") {
    console.error(`[${context}] permission-denied: تحقق من قواعد Firestore`, error);
  } else {
    console.error(`[${context}]`, error);
  }
  showErrorBanner();
}

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

function createAvatar(data) {
  const avatarWrap = document.createElement("div");
  avatarWrap.className = "avatar";
  const displayName = data.displayName || usersMap.get(data.uid)?.displayName || data.uid || "?";
  avatarWrap.textContent = getInitials(displayName);
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

    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.className = "action-btn";
    deleteBtn.textContent = "🗑";
    deleteBtn.dataset.action = "delete";

    actions.append(editBtn, deleteBtn);
    header.appendChild(actions);
  }

  const textEl = document.createElement("div");
  textEl.className = "message-text";
  textEl.textContent = msg.text || "";

  bubble.append(header, textEl, createStatusRow(msg));
  const readStatus = document.createElement("div");
  readStatus.className = "read-status";
  bubble.appendChild(readStatus);
  return bubble;
}

function renderPendingBubble(localId, payload) {
  const existing = chatBox.querySelector(`.pending-row[data-local-id="${localId}"]`);
  if (existing) existing.remove();

  const row = document.createElement("div");
  row.className = "message-row mine pending-row";
  row.dataset.localId = localId;

  const avatar = createAvatar({ uid: auth.currentUser?.uid, displayName: auth.currentUser?.displayName });
  const bubble = document.createElement("div");
  bubble.className = "message sent pending";

  const textEl = document.createElement("div");
  textEl.className = "message-text";
  textEl.textContent = payload.text || "";
  bubble.appendChild(textEl);

  const pendingLabel = document.createElement("div");
  pendingLabel.className = "pending-label";
  pendingLabel.textContent = "جاري الإرسال…";
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
  const label = bubble.querySelector(".pending-label") || bubble.appendChild(Object.assign(document.createElement("div"), { className: "pending-label" }));
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

function clearMatchedPending(messages, currentUid) {
  const seenClientIds = new Set(messages.filter((msg) => msg.uid === currentUid && msg.clientMessageId).map((msg) => msg.clientMessageId));
  pendingMap.forEach((pending, localId) => {
    if (pending.clientMessageId && seenClientIds.has(pending.clientMessageId)) removePending(localId);
  });
}

function renderMessages(messages, currentUid) {
  renderedMessages = messages;
  clearMatchedPending(messages, currentUid);

  chatBox.innerHTML = "";
  messages.forEach((msg) => {
    const isMine = msg.uid === currentUid;
    const row = document.createElement("div");
    row.className = `message-row ${isMine ? "mine" : "other"}`;
    row.append(createAvatar(msg), createBubbleContent(msg.id, msg, isMine));
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
    if (seenIndex !== undefined && seenIndex >= lastMineIndex) seenBy.push(read.displayName || "مستخدم");
  });

  const lastEl = chatBox.querySelector(`.message[data-id="${lastMine.id}"] .read-status`);
  if (!lastEl) return;
  if (!seenBy.length) lastEl.textContent = "تم الإرسال";
  else if (seenBy.length <= 2) lastEl.textContent = `شوهد بواسطة ${seenBy.join("، ")}`;
  else lastEl.textContent = "شوهد";
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

  const text = (payload.text || "").trim();
  if (!text) return;

  const localId = existingLocalId || `local_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const clientMessageId = payload.clientMessageId || `client_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

  payload.clientMessageId = clientMessageId;
  payload.text = text;
  pendingMap.set(localId, payload);
  renderPendingBubble(localId, payload);

  try {
    await addDoc(collection(db, "messages"), {
      roomId: ROOM_ID,
      clientMessageId,
      type: "text",
      text,
      uid: user.uid,
      displayName: user.displayName || user.email,
      createdAt: serverTimestamp(),
    });

    if (!existingLocalId) {
      messageInput.value = "";
      autoResizeTextarea();
    }
  } catch (error) {
    logFirebaseError("sendMessagePayload", error);
    markPendingFailed(localId);
  }
}

async function sendCurrentMessage() {
  const text = messageInput.value.trim();
  if (!text) return;
  await sendMessagePayload({ text });
}

function setupCoreEvents() {
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

    if (target.dataset.action === "edit") return void openEdit(messageEl);
    if (target.dataset.action === "cancel-edit") return void cancelEdit(messageEl);

    if (target.dataset.action === "save-edit") {
      const newText = messageEl.querySelector(".edit-input")?.value.trim();
      const id = messageEl.dataset.id;
      if (!id || !newText) return;
      try {
        await updateDoc(doc(db, "messages", id), { text: newText, editedAt: serverTimestamp(), type: "text" });
        cancelEdit(messageEl);
      } catch (error) {
        logFirebaseError("updateMessage", error);
      }
      return;
    }

    if (target.dataset.action === "delete") {
      const id = messageEl.dataset.id;
      if (!id || !window.confirm("هل تريد حذف هذه الرسالة؟")) return;
      try {
        await deleteDoc(doc(db, "messages", id));
      } catch (error) {
        logFirebaseError("deleteMessage", error);
      }
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

  logoutButton.addEventListener("click", async () => {
    if (typingManager) typingManager.stopTyping();
    await signOut(auth);
    window.location.href = "pagelogin.html";
  });

  window.addEventListener("beforeunload", () => {
    if (typingManager) typingManager.stopTyping();
  });
}

function cleanupChatRuntime() {
  if (unsubUsers) unsubUsers();
  if (unsubMessages) unsubMessages();
  unsubUsers = null;
  unsubMessages = null;
  typingManager?.cleanup();
  readsManager?.cleanup();
}

function startChat(user) {
  cleanupChatRuntime();
  activeUid = user.uid;

  const messagesQuery = query(
    collection(db, "messages"),
    where("roomId", "==", ROOM_ID),
    orderBy("createdAt", "asc"),
    limitToLast(100)
  );

  unsubUsers = onSnapshot(
    collection(db, "users"),
    (snap) => {
      usersMap.clear();
      snap.forEach((userDoc) => usersMap.set(userDoc.id, userDoc.data()));
    },
    (error) => logFirebaseError("usersListener", error)
  );

  typingManager = initTypingManager({
    db,
    auth,
    roomId: ROOM_ID,
    inputEl: messageInput,
    indicatorEl: typingIndicator,
    onError: (error) => logFirebaseError("typingListener", error),
  });

  readsManager = createReadsManager({
    db,
    auth,
    roomId: ROOM_ID,
    chatBox,
    getLatestMessageId: () => renderedMessages[renderedMessages.length - 1]?.id || "",
    onReadsChange: (nextReadsMap) => {
      readsMap = nextReadsMap;
      updateSeenStatus(auth.currentUser?.uid || activeUid);
    },
    onError: (error) => logFirebaseError("readsListener", error),
  });

  unsubMessages = onSnapshot(
    messagesQuery,
    (snap) => {
      hideErrorBanner();
      const messages = [];
      snap.forEach((messageDoc) => {
        const data = messageDoc.data();
        if (data.type && data.type !== "text") return;
        messages.push({ ...data, id: messageDoc.id });
      });
      const uid = auth.currentUser?.uid || activeUid;
      renderMessages(messages, uid);
      readsManager.maybeMarkSeen(true);
    },
    (error) => logFirebaseError("messagesListener", error)
  );
}

setupCoreEvents();

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    try {
      await signInAnonymously(auth);
    } catch (error) {
      logFirebaseError("anonymousSignIn", error);
    }
    return;
  }

  startChat(user);
});
