/******************************
 *  CẤU HÌNH
 ******************************/
const SHEET_CSV = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTrWOaqTY5nvD10GK9hFsnvT8sn63wuS1WEkQj4iEeiMG-N61EdGPtt6dgnG-DdZjrzyrUC3Tf4CvKE/pub?output=csv";
// ↑ Giữ link CSV xuất bản của bạn

/******************************
 *  LẤY DANH SÁCH MÃ TỪ CSV
 ******************************/
async function fetchCodes() {
  // Thêm cache-buster để hạn chế cache
  const res = await fetch(`${SHEET_CSV}&t=${Date.now()}`);
  if (!res.ok) throw new Error("CSV error: " + res.status);

  const text = await res.text();

  // Tách dòng an toàn cho \r\n hoặc \n
  const rows = text.split(/\r?\n/).map(r => r.split(","));

  // ĐỌC CỘT A (index 0), chuẩn hóa lowercase, bỏ trống
  let codes = rows.map(r => (r[0] || "").trim()).filter(Boolean);

  // Bỏ hàng tiêu đề "Code" (không phân biệt hoa/thường)
  if (codes.length && codes[0].toLowerCase() === "code") {
    codes = codes.slice(1);
  }

  // So khớp không phân biệt hoa/thường
  return codes.map(c => c.toLowerCase());
}

/******************************
 *  XỬ LÝ MỞ KHÓA (mỗi lần vào đều phải nhập)
 ******************************/
async function handleUnlock() {
  const input = document.getElementById("code");
  const course = document.getElementById("course");
  const btn = document.getElementById("unlockBtn");

  const code = (input.value || "").trim().toLowerCase();
  if (!code) {
    alert("Vui lòng nhập mã!");
    input.focus();
    return;
  }

  // UI loading nhẹ
  if (btn) {
    btn.disabled = true;
    btn.dataset._text = btn.textContent;
    btn.textContent = "Đang kiểm tra...";
  }

  try {
    const codes = await fetchCodes();
    if (codes.includes(code)) {
      // KHÔNG lưu trạng thái — chỉ mở cho phiên hiện tại
      course.classList.remove("hidden");
      window.scrollTo({ top: course.offsetTop, behavior: "smooth" });
    } else {
      alert("Mã không hợp lệ!");
      course.classList.add("hidden");
    }
  } catch (err) {
    console.error(err);
    alert("Không thể kiểm tra mã, vui lòng thử lại!");
    course.classList.add("hidden");
  } finally {
    if (btn) {
      btn.disabled = false;
      if (btn.dataset._text) btn.textContent = btn.dataset._text;
    }
  }
}

/******************************
 *  SỰ KIỆN UI
 ******************************/
document.addEventListener("DOMContentLoaded", () => {
  const input = document.getElementById("code");
  const btn = document.getElementById("unlockBtn");
  const course = document.getElementById("course");

  // Luôn khóa nội dung khi tải trang / F5
  if (course) course.classList.add("hidden");

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
  document.getElementById("quizFrame").src = file;
  document.getElementById("quizPopup").classList.add("active");
};
window.closeQuiz = function() {
  document.getElementById("quizPopup").classList.remove("active");
  document.getElementById("quizFrame").src = "";
};
