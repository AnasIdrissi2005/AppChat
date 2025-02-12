// إضافة حدث عند إرسال النموذج
document.getElementById('forgot-password-form').addEventListener('submit', function (event) {
    event.preventDefault(); // منع إعادة تحميل الصفحة

    const email = document.getElementById('email').value;
    const errorMessage = document.getElementById('error-message');

    // جلب بيانات المستخدمين من LocalStorage
    const users = JSON.parse(localStorage.getItem('users')) || [];

    // التحقق من وجود البريد الإلكتروني
    const user = users.find(user => user.email === email);
    if (user) {
        errorMessage.textContent = ""; // مسح رسالة الخطأ

        // إنشاء رابط إعادة تعيين كلمة المرور
        const resetLink = `https://anasidrissi2005.github.io/my-chat-app/reset-password.html?email=${encodeURIComponent(email)}`;

        // إرسال البريد الإلكتروني باستخدام EmailJS
        emailjs.send("service_wf9suux", "template_5by3x4k", {
            to_email: email, // البريد الإلكتروني للمستلم
            to_name: email,  // يمكنك استخدام البريد الإلكتروني كاسم المستلم
            from_name: "Anas Idrissi", // اسم المرسل
            reply_to: "anasidrissi05@gmail.com", // البريد الإلكتروني للرد
            reset_link: resetLink // الرابط لإعادة تعيين كلمة المرور
        })
        .then(function(response) {
            alert("تم إرسال رابط استعادة كلمة المرور إلى بريدك الإلكتروني.");
        }, function(error) {
            errorMessage.textContent = "حدث خطأ أثناء إرسال البريد الإلكتروني. يرجى المحاولة مرة أخرى.";
        });
    } else {
        errorMessage.textContent = "البريد الإلكتروني غير مسجل.";
    }
});