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
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const chatBox = document.getElementById("chat-box");
const messageInput = document.getElementById("message-input");
const sendButton = document.getElementById("send-button");
const logoutButton = document.getElementById("logout-button");

const messagesCol = collection(db, "messages");
const messagesQ = query(messagesCol, orderBy("createdAt", "asc"), limit(100));

function addMessageToUI(msg, isMine) {
  const wrap = document.createElement("div");
  wrap.className = `message ${isMine ? "sent" : "received"}`;

  const sender = document.createElement("div");
  sender.className = "sender-name";
  sender.textContent = msg.displayName || "Unknown";

  const text = document.createElement("div");
  text.textContent = msg.text;

  const time = document.createElement("div");
  time.className = "timestamp";
  time.textContent = msg.createdAt?.toDate
    ? msg.createdAt.toDate().toLocaleTimeString()
    : "";

  wrap.append(sender, text, time);
  chatBox.appendChild(wrap);
}

onAuthStateChanged(auth, (user) => {
  if (!user) {
    window.location.href = "pagelogin.html";
    return;
  }

  onSnapshot(messagesQ, (snap) => {
    chatBox.innerHTML = "";
    snap.forEach((doc) => {
      const data = doc.data();
      addMessageToUI(data, data.uid === user.uid);
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
