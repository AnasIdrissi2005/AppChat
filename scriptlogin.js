// scriptlogin.js
import { auth } from "./firebase-init.js";
import { signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const form = document.getElementById("login-form");
const errorEl = document.getElementById("error-message");

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  errorEl.textContent = "";

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  try {
    await signInWithEmailAndPassword(auth, email, password);
    window.location.href = "pagechat.html";
  } catch (err) {
    errorEl.textContent = "فشل تسجيل الدخول. تحقق من البريد/كلمة المرور.";
  }
});
