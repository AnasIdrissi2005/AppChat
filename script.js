// جلب معلومات المستخدم الحالي
const currentUser = JSON.parse(localStorage.getItem('currentUser'));

// جلب عناصر DOM
const chatBox = document.getElementById('chat-box');
const messageInput = document.getElementById('message-input');
const sendButton = document.getElementById('send-button');

// جلب الرسائل من LocalStorage أو إنشاء مصفوفة فارغة
let messages = JSON.parse(localStorage.getItem('messages')) || [];

// عرض الرسائل السابقة
function displayMessages() {
    chatBox.innerHTML = ""; // مسح المحتوى الحالي
    messages.forEach(message => {
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
}

// إرسال رسالة جديدة
function sendMessage() {
    const messageText = messageInput.value.trim();
    if (messageText) {
        const newMessage = {
            sender: currentUser.username,
            text: messageText,
            timestamp: new Date().toLocaleTimeString()
        };
        messages.push(newMessage); // إضافة الرسالة إلى المصفوفة
        localStorage.setItem('messages', JSON.stringify(messages)); // حفظ الرسائل في LocalStorage
        messageInput.value = ""; // مسح حقل الإدخال
        displayMessages(); // عرض الرسائل المحدثة
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

// عرض الرسائل عند تحميل الصفحة
displayMessages();
