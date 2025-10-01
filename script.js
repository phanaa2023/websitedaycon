async function fetchCodes() {
  const sheetUrl = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSx5d_6E2nVNjcUSp8Y4JeNGph2lKrwZ0n6MokdabpT9ZB_uVatIazlMh67vSadsnKjyvv7h17tWRBL/pub?output=csv";
  
  const res = await fetch(sheetUrl);
  const text = await res.text();

  const rows = text.split("\n").map(r => r.split(","));
  // lấy cột B, chuyển hết về chữ thường
  const codes = rows.map(r => r[1]?.trim().toLowerCase()).filter(c => c && c !== "code");
  
  return codes;
}

document.getElementById("unlockBtn").addEventListener("click", async function() {
  const code = document.getElementById("code").value.trim().toLowerCase();
  const course = document.getElementById("course");

  if (!code) {
    alert("Vui lòng nhập mã!");
    return;
  }

  try {
    const codes = await fetchCodes();
    if (codes.includes(code)) {
      course.classList.remove("hidden");
      window.scrollTo({ top: course.offsetTop, behavior: "smooth" });
    } else {
      alert("Mã không hợp lệ!");
    }
  } catch (err) {
    console.error(err);
    alert("Không thể kiểm tra mã, vui lòng thử lại!");
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



