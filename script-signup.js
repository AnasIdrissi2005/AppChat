// script-signup.js
import { auth } from "./firebase-init.js";
import {
  createUserWithEmailAndPassword,
  updateProfile,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const form = document.getElementById("signup-form");
const errorEl = document.getElementById("error-message");

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  errorEl.textContent = "";

  const username = document.getElementById("username").value.trim();
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  try {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(cred.user, { displayName: username });
    window.location.href = "pagechat.html";
  } catch (err) {
    errorEl.textContent = "فشل إنشاء الحساب. جرّب بريدًا آخر أو كلمة مرور أقوى.";
  }
});
