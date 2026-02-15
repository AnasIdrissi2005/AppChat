import {
  collection,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  where,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

function nearBottom(chatBox) {
  return chatBox.scrollHeight - chatBox.scrollTop - chatBox.clientHeight < 100;
}

export function createReadsManager({ db, auth, roomId, chatBox, getLatestMessageId, onReadsChange, onError }) {
  let lastWriteAt = 0;
  let lastWrittenMessageId = "";

  const readsQuery = query(collection(db, "reads"), where("roomId", "==", roomId));
  const unsubReads = onSnapshot(
    readsQuery,
    (snap) => {
      const readMap = new Map();
      snap.forEach((readDoc) => readMap.set(readDoc.id, readDoc.data()));
      onReadsChange(readMap);
    },
    (error) => {
      if (onError) onError(error);
    }
  );

  async function maybeMarkSeen(force = false) {
    const user = auth.currentUser;
    if (!user) return;
    if (!force && !nearBottom(chatBox)) return;

    const latestMessageId = getLatestMessageId();
    if (!latestMessageId) return;

    const now = Date.now();
    if (!force && now - lastWriteAt < 4000 && latestMessageId === lastWrittenMessageId) {
      return;
    }

    await setDoc(
      doc(db, "reads", `${roomId}_${user.uid}`),
      {
        roomId,
        uid: user.uid,
        displayName: user.displayName || user.email || "مستخدم",
        lastReadAt: serverTimestamp(),
        lastSeenMessageId: latestMessageId,
      },
      { merge: true }
    );

    lastWriteAt = now;
    lastWrittenMessageId = latestMessageId;
  }

  const onScroll = () => {
    maybeMarkSeen(false);
  };

  chatBox.addEventListener("scroll", onScroll, { passive: true });

  return {
    maybeMarkSeen,
    cleanup() {
      chatBox.removeEventListener("scroll", onScroll);
      unsubReads();
    },
  };
}
