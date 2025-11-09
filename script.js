const API_URL = "https://script.google.com/macros/s/AKfycbzvMlkiZ10DrOZZB3J0D1oC31Nqsacv9BRVZt2ojpRIhMibB8Bjc3MpoNi9cwkVkLW7jA/exec"; // dán link Apps Script Web App

  function getDeviceId() {
    return btoa(navigator.userAgent + navigator.language + screen.width + screen.height);
  }

  async function checkCode() {
    const codeInput = document.getElementById("code");
    const code = codeInput.value.trim();
    const course = document.getElementById("course");
    const device = getDeviceId();

    if (!code) {
      alert("Vui lòng nhập mã!");
      return;
    }

    try {
      const res = await fetch(`${API_URL}?action=check&code=${encodeURIComponent(code)}&device=${encodeURIComponent(device)}`);
      const data = await res.json();

      if (data.status === "ok") {
        // lưu localStorage để lần sau tự mở khóa
        localStorage.setItem("unlocked", "true");
        course.classList.remove("hidden");
        window.scrollTo({ top: course.offsetTop, behavior: "smooth" });
        alert(data.message);
      } else {
        alert(data.message || "Mã không hợp lệ!");
      }
    } catch (err) {
      console.error(err);
      alert("Không thể kiểm tra mã, vui lòng thử lại!");
    }
  }

  document.getElementById("unlockBtn").addEventListener("click", checkCode);

  // nếu trước đó đã mở khóa trên thiết bị này
  window.addEventListener("load", () => {
    const course = document.getElementById("course");
    if (localStorage.getItem("unlocked") === "true") {
      course.classList.remove("hidden");
    }
  });
window.openQuiz = function(file) {
  document.getElementById("quizFrame").src = file;
  document.getElementById("quizPopup").classList.add("active");
}

window.closeQuiz = function() {
  document.getElementById("quizPopup").classList.remove("active");
  document.getElementById("quizFrame").src = "";
}



