import { DB, getUser, getUserByUsername, getBalance } from './data.js';
import { initAuth, getCurrentUser, login, switchAccount, removeAccount, logout, isLoggedIn, saveSessions, getRegData, getRegStep, setRegMethod, setRegStep, resetReg, sendEmailCode, sendTelegramCode, confirmCode, createAccount } from './auth.js';
import { showPage, $, $$, escHtml, showToast, showModal } from './ui.js';
import { buyGift, sellGift, transferStars, getTransactions, getUserGifts } from './economy.js';
import { isAdmin, isSuperAdmin, verifyUser, givePremium, addStars, showGoldBadge, clearLog } from './admin.js';
import { renderChatList, openChat, sendMessage, searchUsers, startDm } from './chat.js';

let searchTimeout = null;
let activeTab = 'chats';

function init() {
  document.addEventListener('DOMContentLoaded', () => {
    initAuth();
    if(isLoggedIn()) renderMainApp();
    else renderAuth();
    bindGlobalEvents();
  });
}

function bindGlobalEvents() {
  document.addEventListener('click', e => {
    const back = e.target.closest('.back');
    if(back) {
      const target = back.dataset?.back;
      if(target) showPage(target);
      else { const a=document.querySelector('.page.active'); if(a){const p=a.dataset?.prev; if(p&&p!=='reg') showPage(p); else showPage('auth') } }
    }
  });
}

// ======================== АВТОРИЗАЦИЯ ========================
function renderAuth() {
  const app = document.getElementById('app');
  const sessions = DB.sessions.length > 0;
  app.innerHTML = `
    <div id="authPage" class="page active" data-prev="">
      <div class="auth-container">
        <div class="auth-logo">
          <div class="auth-icon">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="1.5"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
          </div>
          <h1>GitTG</h1>
          <div class="sub">Мессенджер с подарками и звёздами</div>
        </div>
        <div id="authContent"></div>
      </div>
    </div>
  `;
  renderAuthStart();
}

function renderAuthStart() {
  const c = $('#authContent');
  if(!c) return;
  c.innerHTML = `
    <div class="auth-start">
      ${DB.sessions.length > 0 ? `
        <div class="saved-accounts">
          <div class="section-title">Сохранённые аккаунты</div>
          ${DB.sessions.map((s,i) => {
            const u = getUser(s.userId);
            if(!u) return '';
            return `<div class="saved-acc" data-idx="${i}">
              <div class="sa-avatar" style="background:hsl(${u.id*37},60%,50%)">${escHtml(u.name[0])}</div>
              <div class="sa-info"><div class="sa-name">${escHtml(u.name)}</div><div class="sa-sub">@${u.username}</div></div>
              <button class="sa-del" data-idx="${i}"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
            </div>`
          }).join('')}
        </div>
      ` : ''}
      <div class="auth-buttons">
        <button class="btn btn-primary" id="regPhoneBtn">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>
          Зарегистрироваться по телефону
        </button>
        <button class="btn btn-secondary" id="regEmailBtn">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
          Зарегистрироваться по email
        </button>
        <div class="auth-divider"><span>или</span></div>
        <button class="btn btn-ghost" id="loginShowBtn">Войти по логину</button>
      </div>
    </div>
  `;
  
  c.querySelectorAll('.saved-acc').forEach(el => {
    el.addEventListener('click', e => {
      if(e.target.closest('.sa-del')) return;
      const idx = parseInt(el.dataset.idx);
      if(switchAccount(idx)) {
        if(isLoggedIn()) { renderMainApp(); showToast('Добро пожаловать!') }
      }
    });
    const del = el.querySelector('.sa-del');
    if(del) del.addEventListener('click', e => {
      e.stopPropagation();
      removeAccount(parseInt(del.dataset.idx));
      renderAuthStart();
    });
  });
  
  $('#regPhoneBtn').addEventListener('click', () => { setRegMethod('phone'); renderRegInput(); });
  $('#regEmailBtn').addEventListener('click', () => { setRegMethod('email'); renderRegInput(); });
  $('#loginShowBtn').addEventListener('click', renderLoginForm);
}

function renderLoginForm() {
  const c = $('#authContent');
  if(!c) return;
  c.innerHTML = `
    <div class="auth-login">
      <div class="step-back" data-back="auth"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M19 12H5m7-7l-7 7 7 7"/></svg></div>
      <h2>Войти</h2>
      <div class="field">
        <input type="text" id="loginUsername" placeholder="Username" autocomplete="off" class="tg-input">
      </div>
      <div class="field">
        <input type="password" id="loginPassword" placeholder="Пароль" class="tg-input">
      </div>
      <button class="btn btn-primary" id="loginBtn">Войти</button>
      <div style="color:var(--text2);font-size:12px;margin-top:12px;text-align:center">Демо: kostya / 123, alice / 123, bob / 123</div>
    </div>
  `;
  $('#loginBtn').addEventListener('click', () => {
    const uname = $('#loginUsername').value.trim();
    const pass = $('#loginPassword').value.trim();
    if(!uname) { showToast('Введите username'); return }
    const res = login(uname, pass);
    if(res.ok) { renderMainApp(); showToast('Добро пожаловать!') }
    else showToast(res.error || 'Ошибка входа');
  });
  $('#loginUsername').addEventListener('keydown', e => { if(e.key==='Enter') $('#loginPassword').focus() });
  $('#loginPassword').addEventListener('keydown', e => { if(e.key==='Enter') $('#loginBtn').click() });
  // back handler
  c.querySelector('.step-back')?.addEventListener('click', renderAuthStart);
}

function renderRegInput() {
  const c = $('#authContent');
  if(!c) return;
  const method = getRegData().method;
  const label = method === 'phone' ? 'Номер телефона' : 'Email';
  const placeholder = method === 'phone' ? '+7 999 999-99-99' : 'example@mail.com';
  const icon = method === 'phone' 
    ? '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>'
    : '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>';
  c.innerHTML = `
    <div class="auth-reg-input">
      <div class="step-back" data-back="auth"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M19 12H5m7-7l-7 7 7 7"/></svg></div>
      <div class="reg-icon">${icon}</div>
      <h2>${method === 'phone' ? 'Регистрация по телефону' : 'Регистрация по email'}</h2>
      <div class="reg-desc">Введите ${label.toLowerCase()}. На него придёт код подтверждения${method === 'phone' ? ' через Telegram Bot' : ''}.</div>
      <div class="field">
        <input type="${method === 'phone' ? 'tel' : 'email'}" id="regInput" placeholder="${placeholder}" class="tg-input" autocomplete="off">
      </div>
      <button class="btn btn-primary" id="sendCodeBtn">Получить код</button>
    </div>
  `;
  c.querySelector('.step-back')?.addEventListener('click', renderAuthStart);
  
  $('#sendCodeBtn').addEventListener('click', () => {
    const val = $('#regInput').value.trim();
    if(!val) { showToast('Введите '+label.toLowerCase()); return }
    if(method === 'email' && !val.includes('@')) { showToast('Некорректный email'); return }
    if(method === 'phone' && val.length < 5) { showToast('Некорректный номер'); return }
    
    const res = method === 'email' ? sendEmailCode(val) : sendTelegramCode(val);
    if(res.ok) {
      showToast('Код отправлен! Проверь консоль браузера (F12)');
      renderRegCode(method);
    } else showToast(res.error || 'Ошибка отправки');
  });
  $('#regInput').addEventListener('keydown', e => { if(e.key==='Enter') $('#sendCodeBtn').click() });
}

function renderRegCode(method) {
  const c = $('#authContent');
  if(!c) return;
  c.innerHTML = `
    <div class="auth-reg-code">
      <div class="step-back" data-back="auth"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M19 12H5m7-7l-7 7 7 7"/></svg></div>
      <div class="reg-icon"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg></div>
      <h2>Подтверждение</h2>
      <div class="reg-desc">Введите 6-значный код, который пришёл ${method === 'phone' ? 'в Telegram' : 'на почту'}</div>
      <div class="code-inputs">
        ${Array(6).fill(0).map((_,i) => `<input type="text" class="code-digit" id="cd${i}" maxlength="1" autocomplete="off">`).join('')}
      </div>
      <button class="btn btn-primary" id="confirmCodeBtn">Подтвердить</button>
      <div style="margin-top:12px"><button class="btn btn-ghost" id="resendCodeBtn">Отправить код заново</button></div>
    </div>
  `;
  
  // Auto-focus next digit
  document.querySelectorAll('.code-digit').forEach((inp, i) => {
    inp.addEventListener('input', () => {
      if(inp.value && i < 5) document.getElementById(`cd${i+1}`).focus();
    });
    inp.addEventListener('keydown', e => {
      if(e.key === 'Backspace' && !inp.value && i > 0) document.getElementById(`cd${i-1}`).focus();
      if(e.key === 'Enter') $('#confirmCodeBtn').click();
    });
  });
  document.getElementById('cd0').focus();
  
  c.querySelector('.step-back')?.addEventListener('click', () => { resetReg(); renderAuthStart(); });
  
  $('#confirmCodeBtn').addEventListener('click', () => {
    const code = Array(6).fill(0).map((_,i) => document.getElementById(`cd${i}`).value).join('');
    if(code.length < 6) { showToast('Введите полный код'); return }
    const res = confirmCode(code);
    if(res.ok) renderRegProfile();
    else showToast(res.error || 'Неверный код');
  });
  
  $('#resendCodeBtn').addEventListener('click', () => {
    const d = getRegData();
    const res = d.method === 'email' ? sendEmailCode(d.email) : sendTelegramCode(d.phone);
    if(res.ok) showToast('Код отправлен заново!');
  });
}

function renderRegProfile() {
  const c = $('#authContent');
  if(!c) return;
  c.innerHTML = `
    <div class="auth-reg-profile">
      <h2>Создание профиля</h2>
      <div class="reg-avatar-preview" id="avatarPreview">
        <div class="avatar-big">?</div>
      </div>
      <div class="field"><input type="text" id="regName" placeholder="Имя" class="tg-input" autocomplete="off"></div>
      <div class="field"><input type="text" id="regUsername" placeholder="@username" class="tg-input" autocomplete="off"></div>
      <div class="field"><input type="password" id="regPass" placeholder="Пароль" class="tg-input"></div>
      <button class="btn btn-primary" id="createAccBtn">Создать аккаунт</button>
    </div>
  `;
  
  // Live avatar preview
  $('#regName').addEventListener('input', () => {
    const val = $('#regName').value.trim();
    const el = document.querySelector('.avatar-big');
    if(el) el.textContent = val ? val[0].toUpperCase() : '?';
  });
  
  $('#createAccBtn').addEventListener('click', () => {
    const name = $('#regName').value.trim();
    const username = $('#regUsername').value.trim().replace('@','');
    const pass = $('#regPass').value.trim();
    if(!name) { showToast('Введите имя'); return }
    if(!username) { showToast('Введите username'); return }
    if(username.length < 3) { showToast('Username минимум 3 символа'); return }
    if(!pass) { showToast('Придумайте пароль'); return }
    if(pass.length < 3) { showToast('Пароль минимум 3 символа'); return }
    
    const res = createAccount(name, username, pass);
    if(res.ok) {
      renderMainApp();
      showToast('Аккаунт создан! Добро пожаловать в GitTG');
    } else showToast(res.error || 'Ошибка создания');
  });
  $('#regName').addEventListener('keydown', e => { if(e.key==='Enter') $('#regUsername').focus() });
  $('#regUsername').addEventListener('keydown', e => { if(e.key==='Enter') $('#regPass').focus() });
  $('#regPass').addEventListener('keydown', e => { if(e.key==='Enter') $('#createAccBtn').click() });
}

// ======================== ОСНОВНОЙ ИНТЕРФЕЙС ========================
function renderMainApp() {
  const app = document.getElementById('app');
  const u = getCurrentUser();
  if(!u) { renderAuth(); return }
  
  app.innerHTML = `
    <div class="app-container">
      <div class="sidebar" id="sidebar">
        <div class="sidebar-header">
          <div class="sidebar-user" id="sidebarUser">
            <div class="avatar" style="background:hsl(${u.id*37},60%,50%)">${escHtml(u.name[0])}${u.verified ? '<span class="gold-badge">★</span>' : ''}</div>
            <div class="sidebar-user-info">
              <div class="sidebar-user-name">${escHtml(u.name)} ${u.verified ? '<span class="gold-star">★</span>' : ''}</div>
              <div class="sidebar-user-status">online</div>
            </div>
          </div>
          <div class="sidebar-actions">
            <button id="toggleSearch" class="icon-btn" title="Поиск"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg></button>
          </div>
        </div>
        <div class="search-bar" id="searchBar" style="display:none">
          <input type="text" id="globalSearch" placeholder="Поиск по @username..." class="search-input">
        </div>
        <div class="sidebar-tabs">
          <button class="tab active" data-tab="chats">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
            Чаты
          </button>
          <button class="tab" data-tab="balance">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
            Звёзды
          </button>
          <button class="tab" data-tab="gifts">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 12v6a2 2 0 01-2 2H6a2 2 0 01-2-2v-6m4-6h8m-4-4v4m-8 2h16"/></svg>
            Подарки
          </button>
          <button class="tab" data-tab="settings">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.32 9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"/></svg>
            Настройки
          </button>
        </div>
        <div class="sidebar-content" id="sidebarContent">
          <div class="tab-content active" id="tabChats"></div>
          <div class="tab-content" id="tabBalance"></div>
          <div class="tab-content" id="tabGifts"></div>
          <div class="tab-content" id="tabSettings"></div>
        </div>
      </div>
      <div class="main-area" id="mainArea">
        <div class="welcome-screen">
          <div class="welcome-icon"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--text2)" stroke-width="1.5"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg></div>
          <div class="welcome-text">Выберите чат</div>
        </div>
      </div>
    </div>
  `;
  
  setupSidebarEvents();
  setupSearch();
  
  // Initial content load
  renderChatList();
  renderBalanceTab();
  renderGiftsTab();
  renderSettingsTab();
}

function setupSidebarEvents() {
  // Tabs
  $$('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      $$('.tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      $$('.tab-content').forEach(tc => tc.classList.remove('active'));
      const target = document.getElementById('tab' + tab.dataset.tab.charAt(0).toUpperCase() + tab.dataset.tab.slice(1));
      if(target) target.classList.add('active');
      activeTab = tab.dataset.tab;
    });
  });
  
  // Sidebar user click -> open profile
  $('#sidebarUser')?.addEventListener('click', () => openProfile(getCurrentUser()));
}

function setupSearch() {
  $('#toggleSearch')?.addEventListener('click', () => {
    const sb = $('#searchBar');
    if(sb) {
      const show = sb.style.display === 'none';
      sb.style.display = show ? 'block' : 'none';
      if(show) { $('#globalSearch')?.focus() }
    }
  });
  
  $('#globalSearch')?.addEventListener('input', () => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      const q = $('#globalSearch').value.trim();
      if(!q) { renderChatList(); return }
      searchUsers(q);
    }, 300);
  });
}

// ======================== БАЛАНС (ВКЛАДКА) ========================
function renderBalanceTab() {
  const c = $('#tabBalance');
  if(!c) return;
  const u = getCurrentUser();
  if(!u) return;
  
  c.innerHTML = `
    <div class="balance-page">
      <div class="balance-card">
        <div class="balance-stars">
          <span class="star-icon">★</span>
          <span class="balance-amount">${u.stars}</span>
        </div>
        <div class="balance-label">Звёзды</div>
      </div>
      <div class="balance-actions">
        <button class="btn btn-primary" id="transferBtn">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          Перевести
        </button>
      </div>
      <div class="section-title">История транзакций</div>
      <div class="transactions-list" id="transList"></div>
    </div>
  `;
  
  renderTransactions();
  
  $('#transferBtn')?.addEventListener('click', () => {
    showModal(`
      <h3>Перевод звёзд</h3>
      <div class="field"><input type="text" id="transferTarget" placeholder="@username" class="tg-input"></div>
      <div class="field"><input type="number" id="transferAmount" placeholder="Количество" class="tg-input" min="1"></div>
      <button class="btn btn-primary" id="doTransferBtn">Перевести</button>
    `);
    $('#doTransferBtn')?.addEventListener('click', () => {
      const target = $('#transferTarget').value.trim().replace('@','');
      const amount = parseInt($('#transferAmount').value);
      if(!target || !amount) { showToast('Заполните все поля'); return }
      const res = transferStars(target, amount);
      if(res.ok) { showToast('Переведено ' + amount + ' ★'); renderBalanceTab(); closeModal() }
      else showToast(res.error || 'Ошибка перевода');
    });
  });
}

function renderTransactions() {
  const list = $('#transList');
  if(!list) return;
  const u = getCurrentUser();
  const txns = getTransactions(u.id);
  if(txns.length === 0) { list.innerHTML = '<div class="empty">Пока нет операций</div>'; return }
  list.innerHTML = txns.slice(-20).reverse().map(t => `
    <div class="txn-item ${t.type}">
      <div class="txn-icon">${t.type === 'gift_in' ? '🎁' : t.type === 'gift_out' ? '🎁' : t.type === 'transfer_in' ? '📥' : t.type === 'transfer_out' ? '📤' : t.amount > 0 ? '➕' : '➖'}</div>
      <div class="txn-info">
        <div class="txn-desc">${escHtml(t.desc)}</div>
        <div class="txn-time">${new Date(t.time).toLocaleString('ru')}</div>
      </div>
      <div class="txn-amount ${t.amount > 0 ? 'positive' : 'negative'}">${t.amount > 0 ? '+' : ''}${t.amount} ★</div>
    </div>
  `).join('');
}

// ======================== ПОДАРКИ (ВКЛАДКА) ========================
function renderGiftsTab() {
  const c = $('#tabGifts');
  if(!c) return;
  const u = getCurrentUser();
  if(!u) return;
  
  const myGifts = getUserGifts(u.id);
  
  c.innerHTML = `
    <div class="gifts-page">
      <div class="section-title">Магазин подарков</div>
      <div class="gift-shop">
        ${DB.giftCatalog.map(g => `
          <div class="gift-item" data-id="${g.id}">
            <div class="gift-emoji">${g.emoji}</div>
            <div class="gift-name">${escHtml(g.name)}</div>
            <div class="gift-price">14 ★</div>
            <button class="btn btn-small buy-gift" data-id="${g.id}">Купить</button>
          </div>
        `).join('')}
      </div>
      
      <div class="section-title">Мои подарки (${myGifts.length})</div>
      <div class="my-gifts" id="myGifts">
        ${myGifts.length === 0 ? '<div class="empty">У вас пока нет подарков</div>' : 
          myGifts.map(g => `
            <div class="my-gift-item">
              <div class="gift-emoji">${g.emoji}</div>
              <div class="gift-meta">
                <div class="gift-from">от ${escHtml(g.fromName)}</div>
                <div class="gift-time">${new Date(g.receivedAt).toLocaleDateString('ru')}</div>
              </div>
              <button class="btn btn-small sell-gift" data-id="${g.instanceId}">Продать за 13★</button>
            </div>
          `).join('')
        }
      </div>
    </div>
  `;
  
  c.querySelectorAll('.buy-gift').forEach(btn => {
    btn.addEventListener('click', () => {
      const gid = btn.dataset.id;
      const res = buyGift(gid);
      if(res.ok) { showToast('Подарок куплен!'); renderGiftsTab(); renderBalanceTab() }
      else showToast(res.error || 'Ошибка');
    });
  });
  
  c.querySelectorAll('.sell-gift').forEach(btn => {
    btn.addEventListener('click', () => {
      const instanceId = parseInt(btn.dataset.id);
      const res = sellGift(instanceId);
      if(res.ok) { showToast('Подарок продан за 13★'); renderGiftsTab(); renderBalanceTab() }
      else showToast(res.error || 'Ошибка');
    });
  });
}

// ======================== НАСТРОЙКИ ========================
function renderSettingsTab() {
  const c = $('#tabSettings');
  if(!c) return;
  const u = getCurrentUser();
  if(!u) return;
  
  let html = `
    <div class="settings-page">
      <div class="section-title">Профиль</div>
      <div class="settings-profile" id="settingsProfile">
        <div class="settings-avatar" style="background:hsl(${u.id*37},60%,50%)">
          ${escHtml(u.name[0])}
          ${u.verified ? '<div class="verified-badge">★</div>' : ''}
        </div>
        <div class="settings-info">
          <div class="settings-name">${escHtml(u.name)}</div>
          <div class="settings-username">@${u.username}</div>
        </div>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text2)" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg>
      </div>
      
      <div class="section-title">Аккаунты</div>
      <div class="accounts-list">
        ${DB.sessions.map((s,i) => {
          const au = getUser(s.userId);
          if(!au) return '';
          return `<div class="account-item">
            <div class="avatar" style="width:36px;height:36px;font-size:14px;background:hsl(${au.id*37},60%,50%)">${escHtml(au.name[0])}</div>
            <div class="info">
              <div class="name">${escHtml(au.name)}</div>
              <div class="uname">@${au.username}</div>
            </div>
            ${i === 0 ? '<div class="badge-active">Активен</div>' : ''}
          </div>`
        }).join('')}
      </div>
      
      <button class="btn btn-ghost danger" id="logoutBtn">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4m7 14l5-5-5-5m5 5H9"/></svg>
        Выйти из всех аккаунтов
      </button>
      
      ${isSuperAdmin() ? `
        <div class="section-title" style="margin-top:24px">🛠 Админ-панель</div>
        <div class="admin-panel-settings">
          <div class="field"><input type="text" id="adminTargetUser" placeholder="@username" class="tg-input"></div>
          <button class="btn btn-small" id="adminVerifyBtn">Выдать верификацию</button>
          <button class="btn btn-small" id="adminPremiumBtn">Выдать Premium</button>
          <div style="margin-top:12px;display:flex;align-items:center;gap:8px">
            <input type="number" id="adminStarsAmount" placeholder="Кол-во" class="tg-input" style="width:100px">
            <button class="btn btn-small" id="adminStarsBtn">Начислить ★</button>
          </div>
          <div class="stat" style="margin-top:16px">Системная комиссия: <strong>${DB.systemProfit || 0} ★</strong></div>
        </div>
      ` : ''}
    </div>
  `;
  
  c.innerHTML = html;
  
  // Settings profile click
  $('#settingsProfile')?.addEventListener('click', () => openProfile(u));
  
  $('#logoutBtn')?.addEventListener('click', () => {
    if(confirm('Выйти из всех аккаунтов?')) {
      logout();
      renderAuth();
    }
  });
  
  if(isSuperAdmin()) {
    $('#adminVerifyBtn')?.addEventListener('click', () => {
      const t = $('#adminTargetUser').value.trim().replace('@','');
      if(!t) { showToast('Введите username'); return }
      const res = verifyUser(t);
      showToast(res.msg || (res.ok ? 'Готово' : 'Ошибка'));
    });
    $('#adminPremiumBtn')?.addEventListener('click', () => {
      const t = $('#adminTargetUser').value.trim().replace('@','');
      if(!t) { showToast('Введите username'); return }
      const res = givePremium(t);
      showToast(res.msg || (res.ok ? 'Готово' : 'Ошибка'));
    });
    $('#adminStarsBtn')?.addEventListener('click', () => {
      const t = $('#adminTargetUser').value.trim().replace('@','');
      const amt = parseInt($('#adminStarsAmount').value);
      if(!t || !amt) { showToast('Заполните поля'); return }
      const res = addStars(t, amt);
      showToast(res.msg || (res.ok ? 'Начислено' : 'Ошибка'));
    });
  }
}

// ======================== ПРОФИЛЬ ========================
function openProfile(user) {
  const u = getCurrentUser();
  if(!u) return;
  
  const isSelf = user.id === u.id;
  const myGifts = getUserGifts(user.id);
  
  const content = `
    <div class="profile-page">
      <div class="profile-header" style="background:hsl(${user.id*37},50%,45%)">
        <button class="back" data-back="main">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="M19 12H5m7-7l-7 7 7 7"/></svg>
        </button>
        <div class="profile-avatar-big">
          <div class="big-avatar">${escHtml(user.name[0])}</div>
          ${user.verified ? '<div class="gold-badge">★</div>' : ''}
        </div>
        <div class="profile-name-big">${escHtml(user.name)}</div>
        <div class="profile-username">@${user.username}</div>
        ${user.bio ? '<div class="profile-bio">' + escHtml(user.bio) + '</div>' : ''}
        ${user.premium ? '<div class="premium-badge">PREMIUM</div>' : ''}
        <div class="profile-stars">★ ${user.stars} звёзд</div>
      </div>
      
      <div class="profile-section">
        <div class="section-title">Подарки (${myGifts.length})</div>
        <div class="profile-gifts">
          ${myGifts.length === 0 ? '<div class="empty">Нет подарков</div>' : 
            myGifts.slice(0,10).map(g => `<div class="profile-gift">${g.emoji}</div>`).join('')
          }
        </div>
      </div>
      
      ${!isSelf ? `
        <div class="profile-actions">
          <button class="btn btn-primary" id="giftUserBtn">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 12v6a2 2 0 01-2 2H6a2 2 0 01-2-2v-6m4 0V6a4 4 0 018 0v6m-8 0h8"/></svg>
            Подарить подарок
          </button>
          <button class="btn btn-secondary" id="msgUserBtn">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
            Написать
          </button>
        </div>
      ` : ''}
    </div>
  `;
  
  showPage('main', content);
  
  if(!isSelf) {
    $('#giftUserBtn')?.addEventListener('click', () => {
      showModal(`
        <h3>Выберите подарок для ${escHtml(user.name)}</h3>
        <div class="gift-shop" style="max-height:300px;overflow-y:auto">
          ${DB.giftCatalog.map(g => `
            <div class="gift-item" style="cursor:pointer" data-id="${g.id}">
              <div class="gift-emoji">${g.emoji}</div>
              <div class="gift-name">${escHtml(g.name)}</div>
              <div class="gift-price">14 ★</div>
            </div>
          `).join('')}
        </div>
      `);
      document.querySelectorAll('.gift-item[data-id]').forEach(el => {
        el.addEventListener('click', () => {
          const gid = el.dataset.id;
          const res = buyGift(gid, user.id);
          if(res.ok) { showToast('Подарок отправлен!'); closeModal() }
          else showToast(res.error || 'Ошибка');
        });
      });
    });
    
    $('#msgUserBtn')?.addEventListener('click', () => {
      startDm(user.id);
      $$('.tab').forEach(t => t.classList.remove('active'));
      document.querySelector('.tab[data-tab="chats"]')?.classList.add('active');
      document.getElementById('tabGifts')?.classList.remove('active');
      document.getElementById('tabBalance')?.classList.remove('active');
      document.getElementById('tabSettings')?.classList.remove('active');
      document.getElementById('tabChats')?.classList.add('active');
    });
  }
}

// ======================== ХЕЛПЕРЫ ========================
export function updateSidebarAfterChange() {
  renderBalanceTab();
  renderGiftsTab();
}

// Make functions globally accessible for onclick handlers
window.renderMainApp = renderMainApp;
window.renderChatList = renderChatList;
window.openProfile = openProfile;
window.getCurrentUser = getCurrentUser;
window.updateSidebarAfterChange = updateSidebarAfterChange;

init();
