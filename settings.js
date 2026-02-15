import { auth, db } from "./firebase-init.js";
import { onAuthStateChanged, updateProfile } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { doc, serverTimestamp, setDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const displayNameInput = document.getElementById("display-name");
const saveButton = document.getElementById("save-settings");
const statusEl = document.getElementById("settings-status");

onAuthStateChanged(auth, (user) => {
  if (!user) {
    window.location.href = "./pagelogin.html";
    return;
  }

  displayNameInput.value = user.displayName || "";
});

saveButton.addEventListener("click", async () => {
  const user = auth.currentUser;
  if (!user) return;

  const nextDisplayName = displayNameInput.value.trim() || user.displayName || "مستخدم";
  statusEl.textContent = "جاري الحفظ...";

  try {
    await updateProfile(user, { displayName: nextDisplayName });

    await setDoc(
      doc(db, "users", user.uid),
      {
        uid: user.uid,
        displayName: nextDisplayName,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );

    statusEl.textContent = "تم حفظ الاسم بنجاح";
  } catch (error) {
    console.error("[settingsSave]", error);
    statusEl.textContent = "حدث خطأ أثناء الحفظ";
  }
});
