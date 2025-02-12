document.getElementById('login-form').addEventListener('submit', function (event) {
    event.preventDefault(); // منع إعادة تحميل الصفحة

    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const errorMessage = document.getElementById('error-message');

    // جلب بيانات المستخدمين من LocalStorage
    const users = JSON.parse(localStorage.getItem('users')) || [];

    // التحقق من وجود اسم المستخدم
    const userExists = users.some(user => user.username === username);

    if (!userExists) {
        errorMessage.textContent = "اسم المستخدم غير مسجل.";
        return;
    }

    // التحقق من صحة البيانات
    const user = users.find(user => user.username === username && user.password === password);
    if (user) {
        errorMessage.textContent = ""; // مسح رسالة الخطأ

        // تخزين معلومات المستخدم الحالي
        localStorage.setItem('currentUser', JSON.stringify(user));

        alert("تم تسجيل الدخول بنجاح!");
        window.location.href = "pagechat.html"; // توجيه المستخدم إلى صفحة الدردشة
    } else {
        errorMessage.textContent = "كلمة المرور غير صحيحة.";
    }
});