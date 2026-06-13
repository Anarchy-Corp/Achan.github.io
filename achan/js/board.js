// ══════════════════════════════════════════════
//  board.js — منطق صفحة البورد
// ══════════════════════════════════════════════

let currentBoardId = null;
let threadsRef     = null;
let threadsCache   = {};

// ── تهيئة صفحة البورد ──────────────────────
document.addEventListener('DOMContentLoaded', () => {
  currentBoardId = getBoardFromURL();
  const board    = BOARDS.find(b => b.id === currentBoardId);

  // تحديث عنوان الصفحة
  document.title = `/${currentBoardId}/ — ${board ? board.name : 'بورد'} | أشان`;

  // تحديث اسم البورد في الصفحة
  const titleEl = document.getElementById('board-title');
  if (titleEl) titleEl.textContent = `/${currentBoardId}/ — ${board ? board.name : ''}`;

  // روابط الكتالوج
  const catalogLink = document.getElementById('catalog-link');
  if (catalogLink) catalogLink.href = `catalog.html?board=${encodeURIComponent(currentBoardId)}`;

  // تحميل الـ Threads
  loadThreads();

  // تهيئة فورم النشر
  initPostForm();
});

// ── تحميل الـ Threads من Firebase ──────────
function loadThreads() {
  const container = document.getElementById('threads-container');
  if (!container) return;

  container.innerHTML = `<div class="loading-spinner"><div class="spinner"></div><p>جارٍ التحميل…</p></div>`;

  threadsRef = db.ref(`boards/${currentBoardId}/threads`);
  threadsRef
    .orderByChild('timestamp')
    .on('value', (snapshot) => {
      threadsCache = {};
      const threadsArr = [];

      snapshot.forEach((child) => {
        const thread = child.val();
        thread._id   = child.key;
        threadsCache[child.key] = thread;
        threadsArr.push(thread);
      });

      // ترتيب من الأحدث للأقدم
      threadsArr.sort((a, b) => (b.lastActivity || b.timestamp) - (a.lastActivity || a.timestamp));

      if (threadsArr.length === 0) {
        container.innerHTML = `
          <div class="empty-state">
            <div class="empty-icon">📝</div>
            <p>لا توجد مواضيع بعد. كن أول من يبدأ نقاشاً!</p>
          </div>`;
        return;
      }

      container.innerHTML = '';
      threadsArr.forEach(thread => {
        container.appendChild(buildThreadCard(thread, thread._id));
      });
    }, (err) => {
      console.error('خطأ في تحميل الـ Threads:', err);
      container.innerHTML = `<div class="empty-state"><p>❌ خطأ في التحميل. تأكد من إعدادات Firebase.</p></div>`;
    });
}

// ── بناء كارت Thread ──────────────────────
function buildThreadCard(thread, threadId) {
  const article = document.createElement('article');
  article.className = 'thread-block';
  article.id = `thread-${threadId}`;

  const postNum  = threadId.substring(0, 8);
  const nameColor = thread.userColor || colorFromId(thread.userId || 'anon');
  const timeStr  = formatArabicDate(thread.timestamp);

  // بناء الردود الأخيرة (آخر 3)
  let repliesHTML = '';
  if (thread.replies) {
    const replies = Object.entries(thread.replies)
      .map(([id, r]) => ({ ...r, _id: id }))
      .sort((a, b) => a.timestamp - b.timestamp)
      .slice(-3);

    if (replies.length > 0) {
      repliesHTML = `<div class="replies-preview">`;
      replies.forEach(reply => {
        const rColor = reply.userColor || colorFromId(reply.userId || 'anon');
        const rTime  = formatArabicDate(reply.timestamp);
        repliesHTML += `
          <div class="reply-block" id="post-${reply._id}">
            <div class="post-header">
              <span class="post-name">${escapeHtml(reply.name || 'مجهول')}</span>
              <span class="post-id" style="background:${rColor}">${reply.userId || '????????'}</span>
              <span class="post-time">${rTime}</span>
              <span class="post-num"><a href="thread.html?board=${encodeURIComponent(currentBoardId)}&thread=${threadId}#post-${reply._id}">№${reply._id.substring(0,6)}</a></span>
              <button class="post-delete-btn" data-type="reply" data-board="${currentBoardId}" data-thread="${threadId}" data-id="${reply._id}" data-hash="${reply.passwordHash || ''}">🗑️</button>
            </div>
            ${reply.imageUrl ? `<div class="thread-image"><img class="post-img" src="${reply.imageUrl}" data-fullsrc="${reply.imageUrl}" alt="صورة الرد" loading="lazy"></div>` : ''}
            <div class="post-content">${processContent(reply.content)}</div>
          </div>`;
      });
      repliesHTML += `</div>`;
    }
  }

  const replyCount = thread.replyCount || 0;
  const imageCount = thread.imageCount || 0;
  const threadURL  = `thread.html?board=${encodeURIComponent(currentBoardId)}&thread=${threadId}`;

  article.innerHTML = `
    <div class="post-header">
      ${thread.title ? `<strong class="thread-title-inline">${escapeHtml(thread.title)}</strong>` : ''}
      <span class="post-name">${escapeHtml(thread.name || 'مجهول')}</span>
      <span class="post-id" style="background:${nameColor}">${thread.userId || '????????'}</span>
      <span class="post-time">${timeStr}</span>
      <span class="post-num"><a href="${threadURL}">№${postNum}</a></span>
      <button class="post-delete-btn" data-type="thread" data-board="${currentBoardId}" data-thread="${threadId}" data-hash="${thread.passwordHash || ''}">🗑️</button>
    </div>
    <div class="thread-body">
      ${thread.imageUrl ? `
        <div class="thread-image">
          <img class="post-img" src="${thread.imageUrl}" data-fullsrc="${thread.imageUrl}" alt="صورة الموضوع" loading="lazy">
        </div>` : ''}
      <div class="thread-text">
        ${thread.title ? `<div class="thread-title">${escapeHtml(thread.title)}</div>` : ''}
        <div class="post-content">${processContent(thread.content)}</div>
        <div class="thread-stats">
          <span id="rc-${threadId}">💬 ${replyCount} رد</span>
          <span id="ic-${threadId}">🖼️ ${imageCount} صورة</span>
        </div>
        <div class="thread-actions">
          <a href="${threadURL}">[ فتح الموضوع ]</a>
          <a href="${threadURL}">[ الرد ]</a>
        </div>
      </div>
    </div>
    ${repliesHTML}
  `;

  // ربط زرار الحذف
  article.querySelectorAll('.post-delete-btn').forEach(btn => {
    btn.addEventListener('click', handleDelete);
  });

  return article;
}

// ── تهيئة فورم النشر ──────────────────────
function initPostForm() {
  const form = document.getElementById('new-thread-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitBtn = form.querySelector('.btn-submit');
    submitBtn.disabled = true;
    submitBtn.textContent = 'جارٍ النشر…';

    try {
      const name     = (form.querySelector('#post-name').value.trim() || 'مجهول').substring(0, 50);
      const title    = form.querySelector('#post-title').value.trim().substring(0, 100);
      const content  = form.querySelector('#post-content').value.trim();
      const password = form.querySelector('#post-password').value.trim();
      const imgFile  = form.querySelector('#post-image').files[0];

      if (!content && !imgFile) {
        showToast('اكتب شيئاً أو ارفع صورة!', 'error');
        return;
      }

      // توليد ID Thread جديد
      const newThreadRef = db.ref(`boards/${currentBoardId}/threads`).push();
      const threadId     = newThreadRef.key;

      // توليد ID المستخدم
      const userId    = getUserIdForThread(threadId);
      const userColor = colorFromId(userId);
      const pwdHash   = await hashPassword(password);

      // رفع الصورة لو موجودة
      let imageUrl = '';
      if (imgFile) {
        showToast('جارٍ رفع الصورة…');
        imageUrl = await uploadImage(currentBoardId, threadId, imgFile);
      }

      const timestamp = Date.now();

      await newThreadRef.set({
        title,
        content,
        name,
        userId,
        userColor,
        imageUrl,
        timestamp,
        lastActivity: timestamp,
        passwordHash: pwdHash,
        replyCount: 0,
        imageCount: imageUrl ? 1 : 0,
      });

      showToast('تم نشر الموضوع!', 'success');
      form.reset();

      // إغلاق الـ details تلقائياً
      const details = form.closest('details');
      if (details) details.open = false;

    } catch (err) {
      console.error('خطأ في النشر:', err);
      showToast('خطأ في النشر. حاول مجدداً.', 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'نشر الموضوع';
    }
  });
}

// ── حذف بوست أو Thread ─────────────────────
async function handleDelete(e) {
  const btn     = e.currentTarget;
  const type    = btn.dataset.type;
  const boardId = btn.dataset.board;
  const threadId = btn.dataset.thread;
  const postId  = btn.dataset.id;
  const storedHash = btn.dataset.hash;

  if (!storedHash) {
    showToast('هذا البوست لا يحتوي على كلمة سر للحذف', 'error');
    return;
  }

  showDeleteDialog(async (password) => {
    const inputHash = await hashPassword(password);
    if (inputHash !== storedHash) {
      showToast('كلمة السر غلط!', 'error');
      return;
    }

    try {
      if (type === 'thread') {
        await db.ref(`boards/${boardId}/threads/${threadId}`).remove();
        showToast('تم حذف الموضوع', 'success');
      } else {
        await db.ref(`boards/${boardId}/threads/${threadId}/replies/${postId}`).remove();
        // تحديث العدادات
        const threadSnap = await db.ref(`boards/${boardId}/threads/${threadId}`).once('value');
        const t = threadSnap.val();
        if (t) {
          const replies    = t.replies ? Object.values(t.replies) : [];
          const newRCount  = replies.length;
          const newICount  = replies.filter(r => r.imageUrl).length + (t.imageUrl ? 1 : 0);
          await db.ref(`boards/${boardId}/threads/${threadId}`).update({
            replyCount: newRCount,
            imageCount: newICount,
          });
        }
        showToast('تم حذف الرد', 'success');
      }
    } catch (err) {
      console.error('خطأ في الحذف:', err);
      showToast('خطأ في الحذف', 'error');
    }
  });
}

// ── escape HTML ────────────────────────────
function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
