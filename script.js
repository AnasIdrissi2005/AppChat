// script.js
import { auth, db } from "./firebase-init.js";
import {
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import {
  collection,
  addDoc,
  query,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  doc,
  updateDoc,
  deleteDoc,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const chatBox = document.getElementById("chat-box");
const messageInput = document.getElementById("message-input");
const sendButton = document.getElementById("send-button");
const logoutButton = document.getElementById("logout-button");

const messagesCol = collection(db, "messages");
const messagesQ = query(messagesCol, orderBy("createdAt", "asc"), limit(100));

function addMessageToUI(messageId, msg, isMine) {
  const wrap = document.createElement("div");
  wrap.className = `message ${isMine ? "sent" : "received"}`;
  wrap.dataset.id = messageId;
  wrap.dataset.uid = msg.uid || "";

  const header = document.createElement("div");
  header.className = "message-header";

  const sender = document.createElement("div");
  sender.className = "sender-name";
  sender.textContent = msg.displayName || "Unknown";
  header.appendChild(sender);

  if (isMine) {
    const actions = document.createElement("div");
    actions.className = "message-actions";

    const editBtn = document.createElement("button");
    editBtn.type = "button";
    editBtn.className = "action-btn";
    editBtn.textContent = "✏️";
    editBtn.title = "تعديل";
    editBtn.setAttribute("aria-label", "تعديل الرسالة");
    editBtn.dataset.action = "edit";

    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.className = "action-btn";
    deleteBtn.textContent = "🗑";
    deleteBtn.title = "حذف";
    deleteBtn.setAttribute("aria-label", "حذف الرسالة");
    deleteBtn.dataset.action = "delete";

    actions.append(editBtn, deleteBtn);
    header.appendChild(actions);
  }

  const text = document.createElement("div");
  text.className = "message-text";
  text.textContent = msg.text || "";

  const meta = document.createElement("div");
  meta.className = "timestamp";
  const created = msg.createdAt?.toDate ? msg.createdAt.toDate().toLocaleTimeString() : "";
  const editedLabel = msg.editedAt ? " • تم التعديل" : "";
  meta.textContent = `${created}${editedLabel}`;

  wrap.append(header, text, meta);
  chatBox.appendChild(wrap);
}

function startEdit(messageEl) {
  if (messageEl.classList.contains("editing")) return;
  const textEl = messageEl.querySelector(".message-text");
  if (!textEl) return;

  const originalText = textEl.textContent || "";
  messageEl.dataset.originalText = originalText;
  messageEl.classList.add("editing");

  const editWrap = document.createElement("div");
  editWrap.className = "edit-wrap";

  const editInput = document.createElement("input");
  editInput.type = "text";
  editInput.className = "edit-input";
  editInput.value = originalText;
  editInput.setAttribute("aria-label", "تعديل الرسالة");

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
  editInput.setSelectionRange(editInput.value.length, editInput.value.length);
  editInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      saveBtn.click();
    }
    if (e.key === "Escape") {
      e.preventDefault();
      cancelBtn.click();
    }
  });
}

function cancelEdit(messageEl) {
  const textEl = messageEl.querySelector(".message-text");
  const editWrap = messageEl.querySelector(".edit-wrap");
  if (editWrap) editWrap.remove();
  if (textEl) textEl.style.display = "";
  messageEl.classList.remove("editing");
}

async function saveEdit(messageEl) {
  const id = messageEl.dataset.id;
  const messageUid = messageEl.dataset.uid;
  const currentUid = auth.currentUser?.uid;
  if (!id || !currentUid || messageUid !== currentUid) return;

  const editInput = messageEl.querySelector(".edit-input");
  if (!editInput) return;

  const newText = editInput.value.trim();
  if (!newText) return;

  await updateDoc(doc(db, "messages", id), {
    text: newText,
    editedAt: serverTimestamp(),
  });

  cancelEdit(messageEl);
}

chatBox.addEventListener("click", async (e) => {
  const btn = e.target.closest("button[data-action]");
  if (!btn) return;

  const messageEl = e.target.closest(".message");
  if (!messageEl) return;

  const messageUid = messageEl.dataset.uid;
  const currentUid = auth.currentUser?.uid;
  if (!currentUid || messageUid !== currentUid) return;

  const action = btn.dataset.action;

  if (action === "edit") {
    startEdit(messageEl);
    return;
  }

  if (action === "cancel-edit") {
    cancelEdit(messageEl);
    return;
  }

  if (action === "save-edit") {
    await saveEdit(messageEl);
    return;
  }

  if (action === "delete") {
    const ok = window.confirm("هل تريد حذف هذه الرسالة؟");
    if (!ok) return;
    const id = messageEl.dataset.id;
    if (!id) return;
    await deleteDoc(doc(db, "messages", id));
  }
});

onAuthStateChanged(auth, (user) => {
  if (!user) {
    window.location.href = "pagelogin.html";
    return;
  }

  onSnapshot(messagesQ, (snap) => {
    chatBox.innerHTML = "";
    snap.forEach((messageDoc) => {
      const data = messageDoc.data();
      addMessageToUI(messageDoc.id, data, data.uid === user.uid);
    });
    chatBox.scrollTop = chatBox.scrollHeight;
  });
});

async function sendMessage() {
  const user = auth.currentUser;
  const text = messageInput.value.trim();
  if (!user || !text) return;

  await addDoc(messagesCol, {
    text,
    uid: user.uid,
    displayName: user.displayName || user.email,
    createdAt: serverTimestamp(),
  });

  messageInput.value = "";
}

sendButton.addEventListener("click", sendMessage);
messageInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") sendMessage();
});
logoutButton.addEventListener("click", async () => {
  await signOut(auth);
  window.location.href = "pagelogin.html";
});
