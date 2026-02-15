// script-forgot-password.js
import { auth } from "./firebase-init.js";
import { sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const form = document.getElementById("forgot-form");
const msg = document.getElementById("msg");
const err = document.getElementById("err");

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  msg.textContent = "";
  err.textContent = "";

  const email = document.getElementById("email").value.trim();

  try {
    await sendPasswordResetEmail(auth, email);
    msg.textContent = "تم إرسال رابط إعادة تعيين كلمة المرور إلى بريدك الإلكتروني.";
  } catch (e2) {
    err.textContent = "تعذر إرسال الرابط. تأكد من البريد الإلكتروني.";
  }
});
