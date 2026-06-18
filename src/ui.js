// =========== EGYPT — UI helpers ===========

export const $  = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

// Escape before injecting any user / dynamic string into innerHTML.
// Every innerHTML sink that takes dynamic content MUST wrap it in escapeHtml.
export function escapeHtml(s){
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Transient bottom toast.
export function toast(msg, ms = 2200){
  const host = $('#toasts'); if (!host) return;
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = msg;
  host.appendChild(el);
  requestAnimationFrame(() => el.classList.add('show'));
  setTimeout(() => { el.classList.remove('show'); setTimeout(() => el.remove(), 300); }, ms);
}

// Bigger centred alert. payload: { title, sub?, icon? }
export function alertBig({ title, sub = '', icon = '' }){
  const host = $('#alerts'); if (!host) return;
  const el = document.createElement('div');
  el.className = 'alert-big';
  el.innerHTML =
    (icon ? `<span class="ab-ic">${escapeHtml(icon)}</span>` : '') +
    `<b class="ab-title">${escapeHtml(title)}</b>` +
    (sub ? `<span class="ab-sub">${escapeHtml(sub)}</span>` : '');
  host.appendChild(el);
  requestAnimationFrame(() => el.classList.add('show'));
  setTimeout(() => { el.classList.remove('show'); setTimeout(() => el.remove(), 400); }, 1800);
}
