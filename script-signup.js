// إضافة حدث عند إرسال النموذج
document.getElementById('signup-form').addEventListener('submit', function (event) {
    event.preventDefault(); // منع إعادة تحميل الصفحة

    const username = document.getElementById('username').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const errorMessage = document.getElementById('error-message');

    // التحقق من صحة البيانات
    if (username && email && password) {
        // جلب بيانات المستخدمين من LocalStorage
        const users = JSON.parse(localStorage.getItem('users')) || [];

        // التحقق من عدم وجود مستخدم بنفس الاسم
        const existingUser = users.find(user => user.username === username);
        if (existingUser) {
            errorMessage.textContent = "اسم المستخدم موجود مسبقًا.";
        } else {
            // إضافة المستخدم الجديد
            users.push({ username, email, password });
            // حفظ البيانات في LocalStorage
            localStorage.setItem('users', JSON.stringify(users));
            errorMessage.textContent = ""; // مسح رسالة الخطأ
            alert("تم إنشاء الحساب بنجاح!");
            // توجيه المستخدم إلى صفحة تسجيل الدخول
            window.location.href = "pagelogin.html";
        }
    } else {
        errorMessage.textContent = "يرجى ملء جميع الحقول.";
    }
});