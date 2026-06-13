// ══════════════════════════════════════════════
//  app.js — المنطق المشترك بين جميع الصفحات
// ══════════════════════════════════════════════

// ── البوردات المتاحة ──────────────────────────
const BOARDS = [
  { id: 'أن',  name: 'أنمي ومانجا',       desc: 'نقاشات الأنمي والمانجا والثقافة اليابانية' },
  { id: 'أف',  name: 'أفلام',              desc: 'سينما عالمية وعربية، نقد وتوصيات' },
  { id: 'مس',  name: 'مسلسلات',           desc: 'دراما، كوميديا، إثارة — كل شيء على الشاشة' },
  { id: 'ري',  name: 'رياضة',             desc: 'كرة قدم، كرة سلة، وكل الرياضات' },
  { id: 'ألع', name: 'ألعاب إلكترونية',   desc: 'PC، كونسول، موبايل — كل ما يخص الألعاب' },
  { id: 'ع',   name: 'عشوائي',            desc: 'أي شيء وكل شيء — الفوضى المنظمة' },
  { id: 'تق',  name: 'تقنية',             desc: 'برمجة، أجهزة، ذكاء اصطناعي' },
  { id: 'مو',  name: 'موسيقى وعزف',       desc: 'عزف، تأليف، توصيات موسيقية' },
];

// ── وظيفة توليد ID للمستخدم ──────────────────
function generateUserId() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let id = '';
  for (let i = 0; i < 8; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return id;
}

// ── توليد لون من ID ──────────────────────────
function colorFromId(id) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  const h = Math.abs(hash) % 360;
  return `hsl(${h}, 65%, 42%)`;
}

// ── الحصول على ID المستخدم لـ Thread معين ────
function getUserIdForThread(threadId) {
  const key = `uid_${threadId}`;
  let uid = sessionStorage.getItem(key);
  if (!uid) {
    uid = generateUserId();
    sessionStorage.setItem(key, uid);
  }
  return uid;
}

// ── تهش كلمة السر ──────────────────────────
async function hashPassword(password) {
  if (!password) return '';
  const encoder = new TextEncoder();
  const data = encoder.encode(password + 'achan_salt_2024');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray  = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 16);
}

// ── تنسيق الوقت بالعربية ──────────────────
function formatArabicDate(timestamp) {
  const date = new Date(timestamp);
  const weekdays  = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
  const months    = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
                     'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
  const day  = weekdays[date.getDay()];
  const d    = date.getDate();
  const mon  = months[date.getMonth()];
  const year = date.getFullYear();
  const h    = String(date.getHours()).padStart(2, '0');
  const m    = String(date.getMinutes()).padStart(2, '0');
  return `${day}، ${d} ${mon} ${year} | ${h}:${m}`;
}

// ── وقت نسبي مختصر ───────────────────────
function timeAgo(timestamp) {
  const diff = Date.now() - timestamp;
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins < 1)    return 'الآن';
  if (mins < 60)   return `منذ ${mins} دقيقة`;
  if (hours < 24)  return `منذ ${hours} ساعة`;
  if (days < 30)   return `منذ ${days} يوم`;
  return formatArabicDate(timestamp);
}

// ── معالجة محتوى البوست (Greentext + Quote) ─
function processContent(text) {
  if (!text) return '';
  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  const lines = escaped.split('\n');
  const processed = lines.map(line => {
    // Greentext: سطر يبدأ بـ >
    if (/^\s*&gt;/.test(line) && !/^\s*&gt;&gt;\d/.test(line)) {
      return `<span class="greentext">${line}</span>`;
    }
    // Quote links: >>رقم
    return line.replace(/&gt;&gt;(\d+)/g, (match, num) => {
      return `<a class="quotelink" data-postnum="${num}" href="#post-${num}">&gt;&gt;${num}</a>`;
    });
  });
  return processed.join('<br>');
}

// ── ضغط الصورة ──────────────────────────
function compressImage(file, maxSizeKB = 500) {
  return new Promise((resolve, reject) => {
    if (!file || !file.type.startsWith('image/')) {
      reject(new Error('الملف ليس صورة'));
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;
        const maxDim = 1600;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width  = maxDim;
          } else {
            width  = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        canvas.width  = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        let quality = 0.85;
        const compress = () => {
          canvas.toBlob((blob) => {
            if (!blob) { reject(new Error('فشل الضغط')); return; }
            if (blob.size <= maxSizeKB * 1024 || quality <= 0.2) {
              resolve(blob);
            } else {
              quality -= 0.1;
              compress();
            }
          }, 'image/jpeg', quality);
        };
        compress();
      };
      img.onerror = () => reject(new Error('فشل تحميل الصورة'));
      img.src = e.target.result;
    };
    reader.onerror = () => reject(new Error('فشل قراءة الملف'));
    reader.readAsDataURL(file);
  });
}

// ── رفع صورة لـ Firebase Storage ─────────
async function uploadImage(boardId, threadId, file) {
  try {
    const compressed = await compressImage(file);
    const ext      = 'jpg';
    const filename = `${Date.now()}_${Math.random().toString(36).substr(2, 6)}.${ext}`;
    const path     = `boards/${boardId}/threads/${threadId}/${filename}`;
    const ref      = storage.ref(path);
    await ref.put(compressed, { contentType: 'image/jpeg' });
    const url = await ref.getDownloadURL();
    return url;
  } catch (err) {
    console.error('خطأ في رفع الصورة:', err);
    throw err;
  }
}

// ── إشعار Toast ──────────────────────────
function showToast(msg, type = 'info') {
  let toast = document.getElementById('global-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'global-toast';
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.className = `toast ${type}`;
  // Force reflow
  void toast.offsetWidth;
  toast.classList.add('show');
  clearTimeout(toast._timeout);
  toast._timeout = setTimeout(() => {
    toast.classList.remove('show');
  }, 3000);
}

// ── Lightbox ────────────────────────────
function initLightbox() {
  let lb = document.getElementById('lightbox');
  if (!lb) {
    lb = document.createElement('div');
    lb.id = 'lightbox';
    lb.innerHTML = '<img id="lightbox-img" src="" alt="صورة موسعة">';
    document.body.appendChild(lb);
    lb.addEventListener('click', () => lb.classList.remove('active'));
  }
  document.addEventListener('click', (e) => {
    if (e.target.classList.contains('post-img')) {
      const lbImg = document.getElementById('lightbox-img');
      lbImg.src   = e.target.dataset.fullsrc || e.target.src;
      lb.classList.add('active');
    }
  });
}

// ── Dark Mode ────────────────────────────
function initDarkMode() {
  const btn  = document.getElementById('dark-toggle');
  const body = document.body;
  const saved = localStorage.getItem('achan_theme');
  if (saved === 'dark') body.classList.add('dark');

  const updateBtn = () => {
    if (btn) btn.textContent = body.classList.contains('dark') ? '☀️ فاتح' : '🌙 داكن';
  };
  updateBtn();

  if (btn) {
    btn.addEventListener('click', () => {
      body.classList.toggle('dark');
      localStorage.setItem('achan_theme', body.classList.contains('dark') ? 'dark' : 'light');
      updateBtn();
    });
  }
}

// ── بناء شريط التنقل بين البوردات ────────
function buildBoardNav(activeBoardId) {
  const nav = document.getElementById('board-nav');
  if (!nav) return;
  nav.innerHTML = '';
  BOARDS.forEach((board, i) => {
    const a = document.createElement('a');
    a.href = `board.html?board=${encodeURIComponent(board.id)}`;
    a.textContent = `/${board.id}/`;
    a.title = board.name;
    if (board.id === activeBoardId) a.classList.add('active');
    nav.appendChild(a);
    if (i < BOARDS.length - 1) {
      const sep = document.createElement('span');
      sep.className = 'nav-sep';
      sep.textContent = ' ';
      nav.appendChild(sep);
    }
  });
}

// ── نافذة حذف البوست ─────────────────────
function showDeleteDialog(onConfirm) {
  let overlay = document.getElementById('delete-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'delete-overlay';
    overlay.className = 'delete-dialog-overlay';
    overlay.innerHTML = `
      <div class="delete-dialog">
        <h3>🗑️ حذف البوست</h3>
        <p style="font-size:0.85rem;color:var(--text-muted);margin-bottom:8px;">أدخل كلمة السر لتأكيد الحذف:</p>
        <input type="password" id="delete-pwd-input" placeholder="كلمة السر">
        <div class="delete-dialog-btns">
          <button class="btn-cancel-delete" id="delete-cancel-btn">إلغاء</button>
          <button class="btn-confirm-delete" id="delete-confirm-btn">حذف</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
  }
  const pwdInput = document.getElementById('delete-pwd-input');
  pwdInput.value = '';
  overlay.classList.add('active');

  const confirmBtn = document.getElementById('delete-confirm-btn');
  const cancelBtn  = document.getElementById('delete-cancel-btn');

  const handleConfirm = async () => {
    const pwd = pwdInput.value.trim();
    if (!pwd) { showToast('أدخل كلمة السر', 'error'); return; }
    overlay.classList.remove('active');
    confirmBtn.removeEventListener('click', handleConfirm);
    cancelBtn.removeEventListener('click',  handleCancel);
    await onConfirm(pwd);
  };

  const handleCancel = () => {
    overlay.classList.remove('active');
    confirmBtn.removeEventListener('click', handleConfirm);
    cancelBtn.removeEventListener('click',  handleCancel);
  };

  confirmBtn.addEventListener('click', handleConfirm);
  cancelBtn.addEventListener('click',  handleCancel);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) handleCancel();
  });
  setTimeout(() => pwdInput.focus(), 50);
}

// ── Preview الاقتباس ─────────────────────
function initQuotePreview() {
  let previewEl = null;

  document.addEventListener('mouseover', (e) => {
    const link = e.target.closest('.quotelink');
    if (!link) return;
    const postNum = link.dataset.postnum;
    const target  = document.getElementById(`post-${postNum}`);
    if (!target) return;

    // أنشئ element للـ preview
    if (!previewEl) {
      previewEl = document.createElement('div');
      previewEl.className = 'quote-preview';
      document.body.appendChild(previewEl);
    }

    const content = target.querySelector('.post-content');
    previewEl.textContent = content ? content.textContent.substring(0, 200) + (content.textContent.length > 200 ? '…' : '') : '';
    previewEl.style.display = 'block';

    // تحديد موضع الـ preview
    const rect   = link.getBoundingClientRect();
    const top    = rect.top + window.scrollY - previewEl.offsetHeight - 8;
    const left   = Math.max(8, Math.min(rect.left + window.scrollX, window.innerWidth - 296));
    previewEl.style.top  = `${Math.max(window.scrollY + 8, top)}px`;
    previewEl.style.left = `${left}px`;
  });

  document.addEventListener('mouseout', (e) => {
    const link = e.target.closest('.quotelink');
    if (link && previewEl) {
      previewEl.style.display = 'none';
    }
  });
}

// ── الحصول على URL الـ board الحالي ──────
function getBoardFromURL() {
  const params = new URLSearchParams(window.location.search);
  return params.get('board') || 'ع';
}

// ── الحصول على Thread ID من الـ URL ──────
function getThreadIdFromURL() {
  const params = new URLSearchParams(window.location.search);
  return params.get('thread') || null;
}

// ── تهيئة مشتركة لكل الصفحات ─────────────
document.addEventListener('DOMContentLoaded', () => {
  initDarkMode();
  initLightbox();
  initQuotePreview();
  buildBoardNav(getBoardFromURL());
});
