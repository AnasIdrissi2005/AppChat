// بيانات التكوين من Firebase Console
const firebaseConfig = {
    apiKey: "AIzaSyD_poLBfcbU2qLiqrrVMPIY3KoytebvKC8",
    authDomain: "chat-sit.firebaseapp.com",
    projectId: "chat-sit",
    storageBucket: "chat-sit.appspot.com",
    messagingSenderId: "174491469797",
    appId: "1:174491469797:web:367414d6ef72ed44a4110c",
    measurementId: "G-94ZCDD324Q"
};

// Initialize Firebase
const app = firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// جلب معلومات المستخدم الحالي
const currentUser = JSON.parse(localStorage.getItem('currentUser'));

// جلب عناصر DOM
const chatBox = document.getElementById('chat-box');
const messageInput = document.getElementById('message-input');
const sendButton = document.getElementById('send-button');

// عرض الرسائل السابقة
database.ref('messages').on('value', (snapshot) => {
    const messages = snapshot.val() || [];
    chatBox.innerHTML = ""; // مسح المحتوى الحالي
    Object.values(messages).forEach(message => {
        const messageElement = document.createElement('div');
        messageElement.classList.add('message');

        // تحديد إذا كانت الرسالة مرسلة من المستخدم الحالي
        if (message.sender === currentUser.username) {
            messageElement.classList.add('sent');
        } else {
            messageElement.classList.add('received');
        }

        // إضافة اسم المرسل ونص الرسالة والوقت
        messageElement.innerHTML = `
            <div class="sender-name">${message.sender}</div>
            <div class="message-text">${message.text}</div>
            <div class="timestamp">${message.timestamp}</div>
        `;
        chatBox.appendChild(messageElement);
    });
    chatBox.scrollTop = chatBox.scrollHeight; // التمرير إلى الأسفل
});

// إرسال رسالة جديدة
function sendMessage() {
    const messageText = messageInput.value.trim();
    if (messageText) {
        const newMessage = {
            sender: currentUser.username,
            text: messageText,
            timestamp: new Date().toLocaleTimeString()
        };
        database.ref('messages').push(newMessage); // إضافة الرسالة إلى Firebase
        messageInput.value = ""; // مسح حقل الإدخال
    } else {
        console.error("حقل الرسالة فارغ!");
    }
}

// إرسال الرسالة عند الضغط على زر الإرسال
sendButton.addEventListener('click', sendMessage);

// إرسال الرسالة عند الضغط على مفتاح Enter
messageInput.addEventListener('keydown', function (event) {
    if (event.key === 'Enter') {
        sendMessage();
    }
});
