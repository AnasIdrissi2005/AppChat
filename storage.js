import { storage } from "./firebase-init.js";
import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

function cleanFileName(name) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

export function uploadChatImage({ file, roomId, uid, onProgress }) {
  const fileName = `${Date.now()}_${cleanFileName(file.name || "image")}`;
  const imagePath = `chat_images/${roomId}/${uid}/${fileName}`;
  const storageRef = ref(storage, imagePath);
  const task = uploadBytesResumable(storageRef, file);

  return new Promise((resolve, reject) => {
    task.on(
      "state_changed",
      (snapshot) => {
        const progress = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
        if (onProgress) onProgress(progress);
      },
      (error) => reject(error),
      async () => {
        const imageUrl = await getDownloadURL(task.snapshot.ref);
        resolve({ imageUrl, imagePath });
      }
    );
  });
}

export function uploadAvatar({ file, uid, onProgress }) {
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
  const avatarPath = `avatars/${uid}.${ext}`;
  const storageRef = ref(storage, avatarPath);
  const task = uploadBytesResumable(storageRef, file);

  return new Promise((resolve, reject) => {
    task.on(
      "state_changed",
      (snapshot) => {
        const progress = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
        if (onProgress) onProgress(progress);
      },
      (error) => reject(error),
      async () => {
        const photoURL = await getDownloadURL(task.snapshot.ref);
        resolve({ photoURL, avatarPath });
      }
    );
  });
}
