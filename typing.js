import {
  collection,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  where,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

export function initTypingManager({ db, auth, roomId, inputEl, indicatorEl, onError }) {
  let typingTimer = null;
  let debounceTimer = null;
  let lastState = false;

  const setTypingState = async (isTyping) => {
    const user = auth.currentUser;
    if (!user || lastState === isTyping) return;

    lastState = isTyping;
    await setDoc(
      doc(db, "typing", `${roomId}_${user.uid}`),
      {
        roomId,
        uid: user.uid,
        displayName: user.displayName || user.email || "مستخدم",
        isTyping,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  };

  const handleInput = () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      setTypingState(true);
    }, 300);

    clearTimeout(typingTimer);
    typingTimer = setTimeout(() => {
      setTypingState(false);
    }, 2000);
  };

  const typingQuery = query(
    collection(db, "typing"),
    where("roomId", "==", roomId),
    where("isTyping", "==", true)
  );

  const unsubTyping = onSnapshot(
    typingQuery,
    (snap) => {
      const myUid = auth.currentUser?.uid;
      const names = [];

      snap.forEach((typingDoc) => {
        const data = typingDoc.data();
        if (data.uid && data.uid !== myUid) names.push(data.displayName || "مستخدم");
      });

      if (!names.length) {
        indicatorEl.textContent = "";
      } else if (names.length === 1) {
        indicatorEl.textContent = `${names[0]} يكتب...`;
      } else if (names.length === 2) {
        indicatorEl.textContent = `${names[0]} و ${names[1]} يكتبان...`;
      } else {
        indicatorEl.textContent = "عدة أشخاص يكتبون...";
      }
    },
    (error) => {
      if (onError) onError(error);
    }
  );

  inputEl.addEventListener("input", handleInput);

  const stopTyping = () => {
    clearTimeout(typingTimer);
    clearTimeout(debounceTimer);
    setTypingState(false);
  };

  return {
    stopTyping,
    cleanup() {
      inputEl.removeEventListener("input", handleInput);
      stopTyping();
      unsubTyping();
    },
  };
}
