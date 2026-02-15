import { auth, db } from "./firebase-init.js";
import { uploadAvatar } from "./storage.js";
import { onAuthStateChanged, updateProfile } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { doc, serverTimestamp, setDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const displayNameInput = document.getElementById("display-name");
const avatarInput = document.getElementById("avatar-input");
const avatarPreview = document.getElementById("avatar-preview");
const saveButton = document.getElementById("save-settings");
const statusEl = document.getElementById("settings-status");

let avatarFile = null;

avatarInput.addEventListener("change", (e) => {
  const file = e.target.files?.[0];
  if (!file) return;
  avatarFile = file;
  avatarPreview.src = URL.createObjectURL(file);
  avatarPreview.classList.remove("hidden");
});

onAuthStateChanged(auth, (user) => {
  if (!user) {
    window.location.href = "./pagelogin.html";
    return;
  }

  displayNameInput.value = user.displayName || "";
  if (user.photoURL) {
    avatarPreview.src = user.photoURL;
    avatarPreview.classList.remove("hidden");
  }
});

saveButton.addEventListener("click", async () => {
  const user = auth.currentUser;
  if (!user) return;

  const nextDisplayName = displayNameInput.value.trim() || user.displayName || "مستخدم";
  let nextPhotoURL = user.photoURL || "";

  statusEl.textContent = "جاري الحفظ...";

  try {
    if (avatarFile) {
      const avatarUpload = await uploadAvatar({
        file: avatarFile,
        uid: user.uid,
        onProgress: (progress) => {
          statusEl.textContent = `جاري رفع الصورة... ${progress}%`;
        },
      });
      nextPhotoURL = avatarUpload.photoURL;
    }

    await updateProfile(user, {
      displayName: nextDisplayName,
      photoURL: nextPhotoURL || null,
    });

    await setDoc(
      doc(db, "users", user.uid),
      {
        uid: user.uid,
        displayName: nextDisplayName,
        photoURL: nextPhotoURL,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );

    statusEl.textContent = "تم حفظ الإعدادات بنجاح";
  } catch (error) {
    console.error(error);
    statusEl.textContent = "حدث خطأ أثناء الحفظ";
  }
});
