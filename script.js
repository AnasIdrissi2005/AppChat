// جلب معلومات المستخدم الحالي
const currentUser = JSON.parse(localStorage.getItem('currentUser'));

// جلب عناصر DOM
const chatBox = document.getElementById('chat-box');
const messageInput = document.getElementById('message-input');
const sendButton = document.getElementById('send-button');
const searchIcon = document.getElementById('search-icon');
const searchBox = document.getElementById('search-box');
const searchInput = document.getElementById('search-input');
const searchButton = document.getElementById('search-button');
const searchResult = document.getElementById('search-result');
const contactsList = document.getElementById('contacts-list');

// جلب الرسائل من LocalStorage أو إنشاء مصفوفة فارغة
let messages = JSON.parse(localStorage.getItem('messages')) || [];

// جلب بيانات المستخدمين من LocalStorage
const users = JSON.parse(localStorage.getItem('users')) || [];

// عرض جهات الاتصال
function displayContacts(filter = "") {
    contactsList.innerHTML = ""; // مسح القائمة الحالية
    users.forEach(user => {
        if (user.username !== currentUser.username && user.username.includes(filter)) {
            const contactItem = document.createElement('li');
            contactItem.textContent = user.username;
            contactItem.addEventListener('click', () => {
                // عند النقر على جهة الاتصال، يمكنك إضافة وظيفة لفتح محادثة معها
                alert(`فتح محادثة مع ${user.username}`);
            });
            contactsList.appendChild(contactItem);
        }
    });
}

// إظهار/إخفاء حقل البحث
searchIcon.addEventListener('click', function () {
    searchBox.style.display = searchBox.style.display === 'block' ? 'none' : 'block';
});

// البحث عن مستخدم
searchButton.addEventListener('click', function () {
    const searchTerm = searchInput.value.trim();
    const userExists = users.some(user => user.username === searchTerm);

    if (userExists) {
        searchResult.textContent = `المستخدم "${searchTerm}" مسجل.`;
    } else {
        searchResult.textContent = `المستخدم "${searchTerm}" غير مسجل.`;
    }
});

// عرض الرسائل السابقة
function displayMessages() {
    chatBox.innerHTML = ""; // مسح المحتوى الحالي
    messages.forEach(message => {
        const messageElement = document.createElement('div');
        messageElement.classList.add('message');
        messageElement.innerHTML = `<strong>${message.sender}:</strong> ${message.text}`;
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

// عرض جهات الاتصال والرسائل عند تحميل الصفحة
displayContacts();
displayMessages();