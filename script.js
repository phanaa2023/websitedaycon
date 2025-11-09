/******************************
 *  CẤU HÌNH
 ******************************/
const API_URL = "https://script.google.com/macros/s/AKfycbzE37iPjsiLszaAVdyECYkjkvMLmvWaVZ5sapGZkyb0a2qp7sOiKAhjGzkRQRBxAmIHlw/exec"; 
// TODO: thay bằng Web App URL của Apps Script của bạn nếu bạn deploy lại

/******************************
 *  TIỆN ÍCH
 ******************************/
// UUID v4 mini để tạo deviceId ổn định cho mỗi thiết bị (cần cho giới hạn 2 thiết bị)
function getDeviceId() {
  const KEY = "device_id";
  let id = localStorage.getItem(KEY);
  if (!id) {
    id = ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
      (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c/4).toString(16)
    );
    localStorage.setItem(KEY, id);
  }
  return id;
}

function setButtonLoading(btn, isLoading, loadingText = "Đang kiểm tra...") {
  if (!btn) return;
  if (isLoading) {
    btn.dataset._text = btn.textContent;
    btn.disabled = true;
    btn.textContent = loadingText;
  } else {
    btn.disabled = false;
    if (btn.dataset._text) btn.textContent = btn.dataset._text;
  }
}

/******************************
 *  GỌI API APPS SCRIPT
 ******************************/
async function checkCodeViaApi(userCode) {
  const deviceId = getDeviceId();
  // Thêm cache-buster nhẹ để tránh cache CDN hiếm khi xảy ra
  const url = `${API_URL}?action=check&code=${encodeURIComponent(userCode)}&device=${encodeURIComponent(deviceId)}&t=${Date.now()}`;
  const res = await fetch(url, { method: "GET" });
  if (!res.ok) throw new Error("API error: " + res.status);
  // Kết quả: {status:'ok', message:'...'} hoặc {error:'...', message:'...'}
  return res.json();
}

/******************************
 *  XỬ LÝ MỞ KHÓA
 ******************************/
async function handleUnlock() {
  const input = document.getElementById("code");
  const course = document.getElementById("course");
  const btn = document.getElementById("unlockBtn");

  if (!input || !course || !btn) {
    console.error("Thiếu phần tử #code, #course hoặc #unlockBtn trong HTML.");
    alert("Trang chưa sẵn sàng. Vui lòng tải lại.");
    return;
  }

  // Ép về lowercase + trim để tránh lỗi gõ trên điện thoại / copy-paste
  const userCode = (input.value || "").trim().toLowerCase();
  if (!userCode) {
    alert("Vui lòng nhập mã!");
    input.focus();
    return;
  }

  setButtonLoading(btn, true);

  try {
    const resp = await checkCodeViaApi(userCode);
    if (resp.status === "ok") {
      // KHÔNG lưu trạng thái mở khoá nữa -> chỉ mở cho phiên hiện tại
      course.classList.remove("hidden");
      // Scroll tới nội dung
      window.scrollTo({ top: course.offsetTop, behavior: "smooth" });
    } else {
      // Các lỗi có thể: invalid, expired, used, header_missing, server_error...
      alert(resp.message || "Mã không hợp lệ!");
      // Đảm bảo vẫn đang khóa
      course.classList.add("hidden");
    }
  } catch (e) {
    console.error(e);
    alert("Không thể kiểm tra mã, vui lòng thử lại!");
    course.classList.add("hidden");
  } finally {
    setButtonLoading(btn, false);
  }
}

/******************************
 *  SỰ KIỆN UI — LUÔN YÊU CẦU NHẬP MÃ MỖI LẦN VÀO
 ******************************/
document.addEventListener("DOMContentLoaded", () => {
  const input = document.getElementById("code");
  const btn = document.getElementById("unlockBtn");
  const course = document.getElementById("course");

  // Luôn KHÓA nội dung khi tải trang / F5
  if (course) course.classList.add("hidden");

  // Xoá mọi dấu vết mở khoá trước đây (nếu từng dùng)
  try {
    localStorage.removeItem("course_unlocked");
    localStorage.removeItem("last_code");
  } catch (_) {}

  if (btn) btn.addEventListener("click", handleUnlock);
  if (input) {
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") handleUnlock();
    });
  }
});

/******************************
 *  POPUP QUIZ (nếu có)
 ******************************/
window.openQuiz = function(file) {
  const frame = document.getElementById("quizFrame");
  const popup = document.getElementById("quizPopup");
  if (frame && popup) {
    frame.src = file;
    popup.classList.add("active");
  }
}

window.closeQuiz = function() {
  const frame = document.getElementById("quizFrame");
  const popup = document.getElementById("quizPopup");
  if (frame && popup) {
    popup.classList.remove("active");
    frame.src = "";
  }
}
