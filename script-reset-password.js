// إضافة حدث عند إرسال النموذج
document.getElementById('reset-password-form').addEventListener('submit', function (event) {
    event.preventDefault(); // منع إعادة تحميل الصفحة

    const newPassword = document.getElementById('new-password').value;
    const confirmPassword = document.getElementById('confirm-password').value;
    const errorMessage = document.getElementById('error-message');

    // التحقق من تطابق كلمتي المرور
    if (newPassword !== confirmPassword) {
        errorMessage.textContent = "كلمتا المرور غير متطابقتين.";
        return;
    }

    // جلب البريد الإلكتروني من الرابط
    const urlParams = new URLSearchParams(window.location.search);
    const email = urlParams.get('email');

    // جلب بيانات المستخدمين من LocalStorage
    const users = JSON.parse(localStorage.getItem('users')) || [];

    // البحث عن المستخدم وتحديث كلمة المرور
    const user = users.find(user => user.email === email);
    if (user) {
        user.password = newPassword;
        localStorage.setItem('users', JSON.stringify(users));
        alert("تم تعيين كلمة المرور بنجاح!");
        window.location.href = "./pagelogin.html"; // توجيه المستخدم إلى صفحة تسجيل الدخول
    } else {
        errorMessage.textContent = "البريد الإلكتروني غير صحيح.";
    }
});