// ══════════════════════════════════════════════
//  thread.js — منطق صفحة الـ Thread الكاملة
// ══════════════════════════════════════════════

let currentBoardId  = null;
let currentThreadId = null;
let threadRef       = null;
let postCounter     = 0;

// ── تهيئة صفحة الـ Thread ──────────────────
document.addEventListener('DOMContentLoaded', () => {
  currentBoardId  = getBoardFromURL();
  currentThreadId = getThreadIdFromURL();

  if (!currentThreadId) {
    document.getElementById('thread-container').innerHTML =
      `<div class="empty-state"><p>❌ لم يتم تحديد موضوع.</p></div>`;
    return;
  }

  loadThread();
  initReplyForm();
});

// ── تحميل الـ Thread ────────────────────────
function loadThread() {
  const container = document.getElementById('thread-container');
  if (!container) return;

  container.innerHTML = `<div class="loading-spinner"><div class="spinner"></div><p>جارٍ تحميل الموضوع…</p></div>`;

  threadRef = db.ref(`boards/${currentBoardId}/threads/${currentThreadId}`);
  threadRef.on('value', (snapshot) => {
    const thread = snapshot.val();
    if (!thread) {
      container.innerHTML = `<div class="empty-state"><p>❌ الموضوع غير موجود أو تم حذفه.</p></div>`;
      return;
    }

    renderThread(thread);

    // التنقل للـ hash لو موجود
    const hash = window.location.hash;
    if (hash) {
      setTimeout(() => {
        const target = document.querySelector(hash);
        if (target) {
          target.scrollIntoView({ behavior: 'smooth', block: 'center' });
          target.classList.add('post-highlighted');
          setTimeout(() => target.classList.remove('post-highlighted'), 2000);
        }
      }, 300);
    }
  }, (err) => {
    console.error('خطأ في تحميل الموضوع:', err);
    container.innerHTML = `<div class="empty-state"><p>❌ خطأ في التحميل. تأكد من إعدادات Firebase.</p></div>`;
  });
}

// ── عرض الـ Thread ──────────────────────────
function renderThread(thread) {
  const container = document.getElementById('thread-container');
  if (!container) return;

  container.innerHTML = '';

  // تحديث عنوان الصفحة
  document.title = `${thread.title || 'موضوع'} — /${currentBoardId}/ | أشان`;

  // ── البوست الأصلي (OP) ────────────────────
  const op = buildPostEl({
    post: thread,
    postId: currentThreadId,
    isOP: true,
  });
  container.appendChild(op);

  // ── الردود ───────────────────────────────
  const repliesWrapper = document.createElement('div');
  repliesWrapper.className = 'replies-list';
  repliesWrapper.id = 'replies-list';

  if (thread.replies) {
    const repliesArr = Object.entries(thread.replies)
      .map(([id, r]) => ({ ...r, _id: id }))
      .sort((a, b) => a.timestamp - b.timestamp);

    repliesArr.forEach((reply) => {
      repliesWrapper.appendChild(buildPostEl({
        post: reply,
        postId: reply._id,
        isOP: false,
      }));
    });
  }

  container.appendChild(repliesWrapper);

  // تحديث العداد في الفورم
  const replyCount = thread.replyCount || 0;
  const replyCountEl = document.getElementById('reply-count-display');
  if (replyCountEl) replyCountEl.textContent = `${replyCount} رد`;
}

// ── بناء عنصر البوست ─────────────────────
function buildPostEl({ post, postId, isOP }) {
  const div = document.createElement('div');
  div.className = isOP ? 'thread-op' : 'reply-full';
  div.id = `post-${postId}`;

  const nameColor = post.userColor || colorFromId(post.userId || 'anon');
  const timeStr   = formatArabicDate(post.timestamp);
  const shortId   = postId.substring(0, 8);

  div.innerHTML = `
    <div class="post-header">
      ${isOP && post.title ? `<strong class="thread-title-inline">${escapeHtml(post.title)}</strong>` : ''}
      <span class="post-name">${escapeHtml(post.name || 'مجهول')}</span>
      <span class="post-id" style="background:${nameColor}" title="ID: ${post.userId || '?'}">${post.userId || '????????'}</span>
      <span class="post-time">${timeStr}</span>
      <span class="post-num">
        <a href="#post-${postId}" title="رابط مباشر">№${shortId}</a>
        <button class="reply-quote-btn" data-postid="${postId}" title="اقتبس هذا البوست" style="background:none;border:none;cursor:pointer;color:var(--text-link);font-size:0.78rem;padding:0 4px;font-family:var(--font-main);">[ اقتباس ]</button>
      </span>
      <button class="post-delete-btn" data-type="${isOP ? 'thread' : 'reply'}" data-board="${currentBoardId}" data-thread="${currentThreadId}" data-id="${postId}" data-hash="${post.passwordHash || ''}">🗑️</button>
    </div>
    <div class="thread-body">
      ${post.imageUrl ? `
        <div class="thread-image">
          <img class="post-img" src="${post.imageUrl}" data-fullsrc="${post.imageUrl}" alt="صورة" loading="lazy">
        </div>` : ''}
      <div class="thread-text">
        ${isOP && post.title ? `<div class="thread-title">${escapeHtml(post.title)}</div>` : ''}
        <div class="post-content">${processContent(post.content)}</div>
        ${isOP ? `
          <div class="thread-stats">
            <span id="reply-count-display">${post.replyCount || 0} رد</span>
            <span>🖼️ ${post.imageCount || 0} صورة</span>
          </div>` : ''}
      </div>
    </div>
  `;

  // زرار الاقتباس
  div.querySelector('.reply-quote-btn')?.addEventListener('click', () => {
    const textarea = document.getElementById('reply-content');
    if (textarea) {
      textarea.value += `>>${shortId}\n`;
      textarea.focus();
      textarea.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  });

  // زرار الحذف
  div.querySelector('.post-delete-btn')?.addEventListener('click', handleDeletePost);

  return div;
}

// ── تهيئة فورم الرد ──────────────────────
function initReplyForm() {
  const form = document.getElementById('reply-form');
  if (!form) return;

  // زرار الرد السريع
  const boardLink = document.getElementById('board-back-link');
  if (boardLink) {
    boardLink.href = `board.html?board=${encodeURIComponent(currentBoardId)}`;
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitBtn = form.querySelector('.btn-submit');
    submitBtn.disabled = true;
    submitBtn.textContent = 'جارٍ الإرسال…';

    try {
      const name     = (form.querySelector('#reply-name').value.trim() || 'مجهول').substring(0, 50);
      const content  = form.querySelector('#reply-content').value.trim();
      const password = form.querySelector('#reply-password').value.trim();
      const imgFile  = form.querySelector('#reply-image').files[0];

      if (!content && !imgFile) {
        showToast('اكتب شيئاً أو ارفع صورة!', 'error');
        return;
      }

      // توليد ID المستخدم (ثابت لنفس الـ Thread)
      const userId    = getUserIdForThread(currentThreadId);
      const userColor = colorFromId(userId);
      const pwdHash   = await hashPassword(password);
      const timestamp = Date.now();
      const replyId   = db.ref(`boards/${currentBoardId}/threads/${currentThreadId}/replies`).push().key;

      // رفع الصورة لو موجودة
      let imageUrl = '';
      if (imgFile) {
        showToast('جارٍ رفع الصورة…');
        imageUrl = await uploadImage(currentBoardId, currentThreadId, imgFile);
      }

      // حفظ الرد
      await db.ref(`boards/${currentBoardId}/threads/${currentThreadId}/replies/${replyId}`).set({
        content,
        name,
        userId,
        userColor,
        imageUrl,
        timestamp,
        passwordHash: pwdHash,
      });

      // تحديث العدادات في الـ Thread الأصلي
      const threadSnap = await db.ref(`boards/${currentBoardId}/threads/${currentThreadId}`).once('value');
      const t = threadSnap.val();
      if (t) {
        const replies    = t.replies ? Object.values(t.replies) : [];
        const newRCount  = replies.length;
        const newICount  = replies.filter(r => r.imageUrl).length + (t.imageUrl ? 1 : 0);
        await db.ref(`boards/${currentBoardId}/threads/${currentThreadId}`).update({
          replyCount:   newRCount,
          imageCount:   newICount,
          lastActivity: timestamp,
        });
      }

      showToast('تم إرسال الرد!', 'success');
      form.reset();

    } catch (err) {
      console.error('خطأ في إرسال الرد:', err);
      showToast('خطأ في الإرسال. حاول مجدداً.', 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'إرسال الرد';
    }
  });
}

// ── حذف بوست من صفحة Thread ──────────────
async function handleDeletePost(e) {
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
        setTimeout(() => {
          window.location.href = `board.html?board=${encodeURIComponent(boardId)}`;
        }, 1200);
      } else {
        await db.ref(`boards/${boardId}/threads/${threadId}/replies/${postId}`).remove();
        // تحديث العدادات
        const threadSnap = await db.ref(`boards/${boardId}/threads/${threadId}`).once('value');
        const t = threadSnap.val();
        if (t) {
          const replies   = t.replies ? Object.values(t.replies) : [];
          const newRCount = replies.length;
          const newICount = replies.filter(r => r.imageUrl).length + (t.imageUrl ? 1 : 0);
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
