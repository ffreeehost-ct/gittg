let toastTimer = null;
export function showToast(text, isGold=false) {
  if(toastTimer) { clearTimeout(toastTimer); document.querySelectorAll('.toast').forEach(t=>t.remove()) }
  const el = document.createElement('div');
  el.className = 'toast' + (isGold?' gold':'');
  el.textContent = text;
  document.body.appendChild(el);
  toastTimer = setTimeout(()=>{ el.remove(); toastTimer=null }, 2500);
}
export function showModal(html) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay show';
  overlay.innerHTML = `<div class="modal">${html}</div>`;
  overlay.addEventListener('click', e => { if(e.target===overlay) overlay.remove() });
  document.body.appendChild(overlay);
  return overlay.querySelector('.modal');
}
export function closeModal(el) {
  const ov = el?.closest('.modal-overlay');
  if(ov) ov.remove();
}
export function $(sel, ctx=document) { return ctx.querySelector(sel) }
export function $$(sel, ctx=document) { return [...ctx.querySelectorAll(sel)] }
export function showPage(id) {
  $$('.page.active').forEach(p=>p.classList.remove('active'));
  const page = document.getElementById(id);
  if(page) page.classList.add('active');
}
export function escHtml(str) {
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}