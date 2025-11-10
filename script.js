/******************************
 *  CẤU HÌNH (API mới thay cho CSV)
 ******************************/
const ACCESS_API = "https://script.google.com/macros/s/AKfycbwah8jSr6xWS_B2gdBZ-DjQSIHQsgo9BtHHrIQtyrgzvbDPaIqSRFFvejpvqxqw-9Ii/exec";

/******************************
 *  Device ID ổn định cho mỗi trình duyệt/thiết bị (có fallback & auto-reset)
 ******************************/
function getDeviceId() {
  const KEY = 'deviceId_v1';
  try {
    let id = localStorage.getItem(KEY);
    if (!id) {
      // Ưu tiên UUID v4 bằng crypto nếu có
      if (window.crypto && crypto.getRandomValues) {
        id = ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
          (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
        );
      } else {
        // Fallback cho trình duyệt/webview cũ
        id = 'd-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2);
      }
      localStorage.setItem(KEY, id);
    }
    return id;
  } catch (e) {
    // Private mode chặn localStorage → vẫn tạo id tạm thời
    return 'd-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2);
  }
}

/******************************
 *  JSONP helper: KHÔNG CORS + chống cache + timeout
 ******************************/
function jsonp(url, params = {}, { timeoutMs = 15000 } = {}) {
  return new Promise((resolve, reject) => {
    const cb = 'jsonp_cb_' + Date.now() + '_' + Math.floor(Math.random() * 1e6);
    params.cb = cb;
    params.t = Date.now(); // cache-buster chống cache mobile

    const qs = Object.keys(params)
      .map(k => `${encodeURIComponent(k)}=${encodeURIComponent(params[k])}`)
      .join('&');

    const script = document.createElement('script');
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error('JSONP timeout'));
    }, timeoutMs);

    function cleanup() {
      clearTimeout(timer);
      try { delete window[cb]; } catch(_) { window[cb] = undefined; }
      if (script && script.parentNode) script.parentNode.removeChild(script);
    }

    window[cb] = (data) => { cleanup(); resolve(data); };
    script.onerror = () => { cleanup(); reject(new Error('JSONP network error')); };

    script.src = url + (url.includes('?') ? '&' : '?') + qs;
    document.head.appendChild(script);
  });
}

/******************************
 *  Gọi Web App (Apps Script) để xác thực & đăng ký thiết bị
 *  Ưu tiên JSONP (không CORS). Nếu bị blocker → fallback POST.
 *  Có retry 1 lần: khi nghi ngờ cache hoặc deviceId cũ bị kẹt.
 ******************************/
async function verifyCodeWithServer(code, _retried = false) {
  const KEY = 'deviceId_v1';
  let deviceId = getDeviceId();

  // A) JSONP (không CORS)
  try {
    const data = await jsonp(ACCESS_API, { code, deviceId }, { timeoutMs: 12000 });
    return data;
  } catch (e) {
    console.warn('[JSONP fail]', e && e.message);
  }

  // B) Fallback: POST fetch (có thể bị CORS nếu WebApp không public hoặc bị blocker)
  try {
    const res = await fetch(ACCESS_API, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' }, // simple request tránh preflight
      body: JSON.stringify({ code, deviceId })
    });
    const text = await res.text();
    let data;
    try { data = JSON.parse(text); }
    catch { throw new Error('Response is not JSON: ' + text.slice(0, 200)); }
    if (!res.ok) throw new Error(data && data.message ? data.message : ('HTTP ' + res.status));
    return data;
  } catch (e2) {
    console.error('[POST fallback fail]', e2 && e2.message);

    // C) Retry 1 lần: xoá deviceId (nếu có thể) & thử lại JSONP
    if (!_retried) {
      try { localStorage.removeItem(KEY); } catch(_) {}
      deviceId = getDeviceId();
      try {
        const data = await jsonp(ACCESS_API, { code, deviceId }, { timeoutMs: 12000 });
        return data;
      } catch (e3) {
        console.warn('[JSONP retry fail]', e3 && e3.message);
      }
      // D) Thử POST lần 2 (cuối cùng)
      try {
        const res = await fetch(ACCESS_API, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain' },
          body: JSON.stringify({ code, deviceId })
        });
        const text = await res.text();
        let data;
        try { data = JSON.parse(text); }
        catch { throw new Error('Response is not JSON: ' + text.slice(0, 200)); }
        if (!res.ok) throw new Error(data && data.message ? data.message : ('HTTP ' + res.status));
        return data;
      } catch (e4) {
        console.error('[POST retry fail]', e4 && e4.message);
      }
    }

    throw new Error(e2 && e2.message ? e2.message : 'Không thể kết nối máy chủ.');
  }
}

/******************************
 *  XỬ LÝ MỞ KHÓA (giữ nguyên ý tưởng)
 ******************************/
async function handleUnlock() {
  const input = document.getElementById("code");
  const course = document.getElementById("course");
  const btn = document.getElementById("unlockBtn");

  const code = (input?.value || "").trim().toLowerCase();
  if (!code) {
    alert("Vui lòng nhập mã!");
    input?.focus();
    return;
  }

  if (btn) {
    btn.disabled = true;
    btn.dataset._text = btn.textContent;
    btn.textContent = "Đang kiểm tra...";
  }

  try {
    const result = await verifyCodeWithServer(code);
    console.log("[verifyCodeWithServer]", result);

    if (result && result.allowed) {
      course?.classList.remove("hidden");
      window.scrollTo({ top: course?.offsetTop || 0, behavior: "smooth" });
    } else {
      const msg = (result && result.message) ? result.message : "Không thể dùng mã này.";
      alert(msg);
      course?.classList.add("hidden");
    }
  } catch (err) {
    console.error("[verifyCodeWithServer][error]", err);
    alert(err?.message || "Có lỗi khi kiểm tra mã, vui lòng thử lại!");
    course?.classList.add("hidden");
  } finally {
    if (btn) {
      btn.disabled = false;
      if (btn.dataset._text) btn.textContent = btn.dataset._text;
    }
  }
}

/******************************
 *  SỰ KIỆN UI (giữ nguyên)
 ******************************/
document.addEventListener("DOMContentLoaded", () => {
  const input = document.getElementById("code");
  const btn = document.getElementById("unlockBtn");
  const course = document.getElementById("course");

  if (course) course.classList.add("hidden");

  if (btn) btn.addEventListener("click", handleUnlock);
  if (input) {
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") handleUnlock();
    });
  }

  /* ========== CHAT BUBBLE REVIEWS ==========
     (được tách từ <script> trong index.html — hiển thị đánh giá phụ huynh tuần tự) */
  const reviewData = [
    { name: "Nguyễn Lan", text: "Khóa học rất dễ áp dụng vào thực tế." },
    { name: "Trần Hồng Anh", text: "Những cuốn sách được tặng phải nói là cực kỳ quý giá và giá trị." },
    { name: "Phạm Minh", text: "Phương pháp chuyển hóa tâm thức con cái rất mới mẻ và hiệu quả." },
    { name: "Lê Thu Hà", text: "Khóa học rất bổ ích, đúng với nhu cầu của phụ huynh hiện nay." },
    { name: "Hoàng Mai", text: "Nội dung dễ hiểu, dễ áp dụng." },
    { name: "Vũ Thanh Tùng", text: "Tôi thấy con mình thay đổi rõ rệt sau khi áp dụng theo khóa học." },
    { name: "Đặng Bích Ngọc", text: "Khóa học có nhiều ví dụ thực tế, dễ làm theo." },
    { name: "Ngô Hải Yến", text: "Tài liệu tặng kèm quá tuyệt vời." },
    { name: "Bùi Thảo", text: "Khóa học và những cuốn sách tặng kèm giúp tôi rất nhiều trong việc dạy con." },
    { name: "Đỗ Quang Huy", text: "Khóa học tuyệt vời, đáng để giới thiệu cho bạn bè." }
  ];

  const container = document.getElementById("chatReviewContainer");
  if (container) {
    function getInitials(name) {
      const parts = name.trim().split(/\s+/);
      return parts.map(p => p[0]).join("").toUpperCase().slice(0, 3);
    }
    let currentIndex = 0;
    function showSequentialReview() {
      const review = reviewData[currentIndex];
      const initials = getInitials(review.name);
      container.innerHTML = `
        <div class="chat-bubble" role="status" aria-live="polite">
          <div class="chat-avatar" aria-hidden="true">${initials}</div>
          <div class="chat-content">
            <div class="chat-name">${review.name}</div>
            <div class="chat-text">${review.text}</div>
          </div>
        </div>
      `;
      currentIndex = (currentIndex + 1) % reviewData.length;
    }
    showSequentialReview();
    setInterval(showSequentialReview, 6000);
  }

  /* ========== VIMEO PLAY EFFECT ==========
     (được tách từ <script> trong index.html — hiệu ứng hoa/tuyết rơi khi video phát) */
  if (window.Vimeo && document.querySelectorAll("iframe[src*='vimeo.com']").length) {
    function createParticle(type, container) {
      const particle = document.createElement("div");
      particle.classList.add("particle");

      if (type === "flower") {
        particle.textContent = "🌸";
        particle.style.fontSize = Math.random() * 4 + 6 + "px";
      } else {
        const size = Math.random() * 6 + 4;
        particle.style.width = particle.style.height = size + "px";
        const colors = ["yellow", "red", "deepskyblue", "lime", "orange"];
        const color = colors[Math.floor(Math.random() * colors.length)];
        particle.style.background = color;
        particle.style.borderRadius = "50%";
        particle.style.boxShadow = `0 0 ${size * 1.5}px ${color}`;
      }

      particle.style.position = "absolute";
      particle.style.left = Math.random() * 100 + "%";
      particle.style.top = "-20px";
      particle.style.opacity = 0.9;
      particle.style.transition = "transform 8s linear, top 8s linear, opacity 8s";

      container.appendChild(particle);

      setTimeout(() => {
        particle.style.top = "100%";
        particle.style.transform = `translateX(${Math.random() * 100 - 50}px) rotate(${Math.random() * 360}deg)`;
        particle.style.opacity = 0.2;
      }, 100);

      setTimeout(() => particle.remove(), 9000);
    }

    function startEffect(container) {
      const interval = setInterval(() => {
        const type = Math.random() > 0.5 ? "flower" : "snow";
        createParticle(type, container);
      }, 200);
      setTimeout(() => clearInterval(interval), 10000);
    }

    document.querySelectorAll("iframe[src*='vimeo.com']").forEach((iframe) => {
      const player = new Vimeo.Player(iframe);
      const wrapper = document.createElement("div");
      wrapper.classList.add("effect-layer");
      iframe.parentNode.style.position = "relative";
      iframe.parentNode.appendChild(wrapper);
      player.on("play", () => startEffect(wrapper));
    });
  }
});

/******************************
 *  POPUP QUIZ (giữ nguyên từ script.js gốc)
 ******************************/
window.openQuiz = function(file) {
  document.getElementById("quizFrame").src = file;
  document.getElementById("quizPopup").classList.add("active");
};
window.closeQuiz = function() {
  document.getElementById("quizPopup").classList.remove("active");
  document.getElementById("quizFrame").src = "";
};
