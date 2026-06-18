import { DB, getUser, getUserByUsername, getBalance } from './data.js';
import { initAuth, getCurrentUser, login, switchAccount, removeAccount, logout, isLoggedIn, saveSessions } from './auth.js';
import { showPage, $, $$, escHtml, showToast, showModal } from './ui.js';
import { buyGift, sellGift, transferStars, getTransactions, getUserGifts } from './economy.js';
import { isAdmin, isSuperAdmin, verifyUser, givePremium, addStars, showGoldBadge, clearLog } from './admin.js';
import { renderChatList, openChat, sendMessage, searchUsers, startDm } from './chat.js';

function init() {
  document.addEventListener('DOMContentLoaded', () => {
    initAuth();
    if(isLoggedIn()) renderMainApp();
    else renderAuth();
    bindGlobalEvents();
  });
}

function bindGlobalEvents() {
  // back buttons
  document.addEventListener('click', e => {
    const back = e.target.closest('.back');
    if(!back) return;
    const target = back.dataset?.back;
    if(target) showPage(target);
    else {
      const active = document.querySelector('.page.active');
      if(active) {
        const prev = active.dataset?.prev;
        if(prev) showPage(prev);
      }
    }
  });
}

function renderAuth() {
  const app = document.getElementById('app');
  app.innerHTML = `
    <div id="authPage" class="page active">
      <div class="auth-box">
        <h1>GitTG</h1>
        <div class="sub">Мессенджер нового поколения</div>
        <div id="loginForm">
          <input type="text" id="loginUsername" placeholder="Username" autocomplete="off">
          <input type="password" id="loginPassword" placeholder="Пароль">
          <button class="btn btn-primary" id="loginBtn">Войти</button>
          <div style="color:var(--text2);font-size:12px;margin-top:8px">Демо: kostya / 123</div>
        </div>
        <div id="authAccounts" class="accounts"></div>
      </div>
    </div>
  `;
  renderAuthAccounts();
  $('#loginBtn').addEventListener('click', handleLogin);
  $('#loginUsername').addEventListener('keydown', e => { if(e.key==='Enter') $('#loginPassword').focus() });
  $('#loginPassword').addEventListener('keydown', e => { if(e.key==='Enter') handleLogin() });
}

function handleLogin() {
  const uname = $('#loginUsername').value.trim();
  const pass = $('#loginPassword').value.trim();
  if(!uname) { showToast('Введите username'); return }
  const res = login(uname, pass);
  if(res.ok) {
    if(isLoggedIn()) { renderMainApp(); showToast('Добро пожаловать!') }
  } else {
    showToast(res.error || 'Ошибка входа')
  }
}

function renderAuthAccounts() {
  const container = $('#authAccounts');
  if(!container) return;
  if(DB.sessions.length === 0) { container.innerHTML = ''; return }
  container.innerHTML = '<div style="font-size:13px;color:var(--text2);margin-bottom:8px">Сохраненные аккаунты</div>' + 
    DB.sessions.map((s,i) => {
      const u = getUser(s.userId);
      if(!u) return '';
      return `<div class="account-item" data-idx="${i}">
        <div class="avatar" style="width:36px;height:36px;font-size:14px">${u.name[0]}</div>
        <div class="info">
          <div class="name">${escHtml(u.name)}</div>
          <div class="uname">@${u.username}</div>
        </div>
        <button class="del" data-idx="${i}">✕</button>
      </div>`
    }).join('');
  container.querySelectorAll('.account-item').forEach(el => {
    const idx = parseInt(el.dataset.idx);
    el.addEventListener('click', e => {
      if(e.target.closest('.del')) return;
      if(switchAccount(idx)) {
        if(isLoggedIn()) { renderMainApp(); showToast('Аккаунт сменен') }
      }
    });
    const delBtn = el.querySelector('.del');
    if(delBtn) delBtn.addEventListener('click', e => {
      e.stopPropagation();
      removeAccount(idx);
      if(isLoggedIn()) renderMainApp();
      else renderAuthAccounts();
    });
  });
}

function renderMainApp() {
  const user = getCurrentUser();
  if(!user) { renderAuth(); return }
  
  const app = document.getElementById('app');
  const isAdm = isAdmin(user) || isSuperAdmin(user);
  
  app.innerHTML = `
    <div id="chatsPage" class="page active" data-prev="authPage">
      <div class="header">
        <div class="search-wrap">
          <span class="icon">🔍</span>
          <input type="text" id="searchInput" placeholder="Поиск по @username">
        </div>
      </div>
      <div id="searchResults" style="display:none"></div>
      <div class="chats-list" id="chatList"></div>
      <div class="bot-nav">
        <button class="nav-item active" data-tab="chats"><span class="nav-icon">💬</span>Чаты</button>
        <button class="nav-item" data-tab="contacts"><span class="nav-icon">👤</span>Контакты</button>
        <button class="nav-item" data-tab="settings"><span class="nav-icon">⚙️</span>Настройки</button>
      </div>
    </div>

    <div id="chatPage" class="page" data-prev="chatsPage">
      <div class="header">
        <button class="back" data-back="chatsPage">←</button>
        <div class="avatar" id="chatHeaderAvatar"></div>
        <h2 id="chatHeaderTitle"></h2>
      </div>
      <div class="messages" id="msgList"></div>
      <div class="chat-input-wrap">
        <button class="attach-btn" id="attachBtn">📎</button>
        <input type="text" id="msgInput" placeholder="Сообщение...">
        <button class="send-btn" id="sendBtn">➤</button>
      </div>
    </div>

    <div id="profilePage" class="page" data-prev="chatsPage">
      <div class="header">
        <button class="back">←</button>
        <h2>Профиль</h2>
      </div>
      <div id="profileContent"></div>
    </div>

    <div id="settingsPage" class="page" data-prev="chatsPage">
      <div class="header">
        <button class="back" data-back="chatsPage">←</button>
        <h2>Настройки</h2>
      </div>
      <div class="settings-tabs" id="settingsTabs">
        <button class="tab active" data-tab="profile">Профиль</button>
        <button class="tab" data-tab="balance">🌟 Баланс</button>
        <button class="tab" data-tab="gifts">🎁 Подарки</button>
        ${isAdm ? '<button class="tab" data-tab="admin">🛠 Админ</button>' : ''}
      </div>
      <div class="settings-content" id="settingsContent"></div>
    </div>
  `;

  renderChatList();
  bindNav();
  bindSearch();
  bindChatInput();
  bindSettingsTabs();
  renderSettingsTab('profile');
}

function bindNav() {
  $$('.bot-nav .nav-item').forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.tab;
      $$('.bot-nav .nav-item').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      if(tab === 'chats') { showPage('chatsPage'); renderChatList() }
      else if(tab === 'contacts') showContacts();
      else if(tab === 'settings') { showPage('settingsPage'); renderSettingsTab('profile') }
    });
  });
}

function showContacts() {
  const page = document.getElementById('chatsPage');
  if(!page) return;
  const results = document.getElementById('searchResults');
  results.style.display = 'block';
  results.innerHTML = '<div style="padding:16px"><div class="section-title" style="font-size:13px;color:var(--text2);margin-bottom:8px">Все пользователи</div>' +
    DB.users.filter(u=>!u.isBot).map(u => `<div class="search-result-item" data-uid="${u.id}">
      <div class="avatar" style="width:40px;height:40px;font-size:14px">${escHtml(u.name[0])}</div>
      <div class="info">
        <div class="name">${escHtml(u.name)} ${u.verified?'<span style="color:var(--accent);font-size:13px">✓</span>':''} ${u.username==='kostya'?showGoldBadge():''}</div>
        <div class="uname">@${escHtml(u.username)}</div>
      </div>
    </div>`).join('') + '</div>';
  results.querySelectorAll('.search-result-item').forEach(el => {
    el.addEventListener('click', () => startDm(parseInt(el.dataset.uid)));
  });
}

function bindSearch() {
  const inp = document.getElementById('searchInput');
  const results = document.getElementById('searchResults');
  if(!inp || !results) return;
  
  let timer;
  inp.addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      const q = inp.value.trim();
      if(!q) { results.style.display='none'; return }
      const found = searchUsers(q);
      results.style.display = 'block';
      if(found.length === 0) {
        results.innerHTML = '<div class="empty-state"><p>Ничего не найдено</p></div>'
        return
      }
      results.innerHTML = found.map(u => {
        const isBot = u.isBot;
        return `<div class="search-result-item" data-uid="${u.id}">
          <div class="avatar" style="width:40px;height:40px;font-size:14px">${escHtml(u.name[0])}</div>
          <div class="info">
            <div class="name">${escHtml(u.name)} ${u.verified?'<span style="color:var(--accent);font-size:13px">✓</span>':''} ${u.username==='kostya'?showGoldBadge():''} ${isBot?'<span style="font-size:11px;color:var(--text2)">бот</span>':''}</div>
            <div class="uname">@${escHtml(u.username)}</div>
          </div>
        </div>`
      }).join('');
      results.querySelectorAll('.search-result-item').forEach(el => {
        el.addEventListener('click', () => {
          const uid = parseInt(el.dataset.uid);
          const u = getUser(uid);
          if(u && u.isBot) {
            showToast('Это системный бот, с ним нельзя начать чат');
            return;
          }
          startDm(uid);
          results.style.display='none';
          inp.value='';
        });
      });
    }, 300);
  });
  inp.addEventListener('blur', () => setTimeout(()=>results.style.display='none', 200));
  inp.addEventListener('focus', () => { if(inp.value.trim()) results.style.display='block' });
}

function bindChatInput() {
  const send = document.getElementById('sendBtn');
  const inp = document.getElementById('msgInput');
  if(send) send.addEventListener('click', sendMessage);
  if(inp) inp.addEventListener('keydown', e => { if(e.key==='Enter') sendMessage() });
  
  const attach = document.getElementById('attachBtn');
  if(attach) {
    attach.addEventListener('click', () => {
      showModal(`
        <h3>Прикрепить</h3>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
          <button class="btn btn-secondary" style="padding:12px;border:none;border-radius:10px;background:var(--bg3);color:var(--text);cursor:pointer;font-size:14px" onclick="this.closest('.modal-overlay').remove();showToast('Файлы скоро появятся')">📷 Фото</button>
          <button class="btn btn-secondary" style="padding:12px;border:none;border-radius:10px;background:var(--bg3);color:var(--text);cursor:pointer;font-size:14px" onclick="this.closest('.modal-overlay').remove();showToast('Файлы скоро появятся')">📎 Файл</button>
          <button class="btn btn-secondary" style="padding:12px;border:none;border-radius:10px;background:var(--bg3);color:var(--text);cursor:pointer;font-size:14px" onclick="this.closest('.modal-overlay').remove();showToast('Голосовые сообщения скоро появятся')">🎤 Голос</button>
          <button class="btn btn-secondary" style="padding:12px;border:none;border-radius:10px;background:var(--bg3);color:var(--text);cursor:pointer;font-size:14px" onclick="this.closest('.modal-overlay').remove();showToast('Геолокация скоро появится')">📍 Гео</button>
        </div>
      `);
    });
  }
}

function bindSettingsTabs() {
  const tabs = document.getElementById('settingsTabs');
  if(!tabs) return;
  tabs.addEventListener('click', e => {
    const tab = e.target.closest('.tab');
    if(!tab) return;
    $$('.tab', tabs).forEach(t=>t.classList.remove('active'));
    tab.classList.add('active');
    renderSettingsTab(tab.dataset.tab);
  });
}

function renderSettingsTab(tabName) {
  const user = getCurrentUser();
  if(!user) return;
  const content = document.getElementById('settingsContent');
  if(!content) return;
  
  if(tabName === 'profile') {
    content.innerHTML = `
      <div class="section">
        <div class="section-title">Профиль</div>
        <div class="field">
          <label>Имя</label>
          <input type="text" id="editName" value="${escHtml(user.name)}">
        </div>
        <div class="field">
          <label>Username</label>
          <input type="text" id="editUsername" value="${escHtml(user.username)}">
        </div>
        <div class="field">
          <label>О себе</label>
          <textarea id="editBio">${escHtml(user.bio||'')}</textarea>
        </div>
        <button class="save-btn" id="saveProfile">Сохранить</button>
      </div>
      <div class="section">
        <div class="section-title">Аккаунт</div>
        <button class="save-btn" style="background:var(--red)" id="logoutBtn">Выйти</button>
      </div>
    `;
    $('#saveProfile')?.addEventListener('click', () => {
      user.name = $('#editName').value.trim() || user.name;
      user.username = $('#editUsername').value.trim() || user.username;
      user.bio = $('#editBio').value.trim();
      // update sessions
      const sess = DB.sessions.find(s=>s.userId===user.id);
      if(sess) sess.username = user.username;
      saveSessions();
      showToast('Профиль обновлен');
    });
    $('#logoutBtn')?.addEventListener('click', () => {
      logout();
      renderAuth();
    });
  } else if(tabName === 'balance') {
    const balance = getBalance(user.id);
    const txns = getTransactions(user.id).slice(0, 10);
    content.innerHTML = `
      <div class="section">
        <div class="balance-card">
          <div class="label">Твой баланс</div>
          <div class="amount">⭐ ${balance}</div>
          <div style="color:var(--text2);font-size:13px">Звезды GitTG</div>
        </div>
        <div class="balance-actions">
          <button class="btn btn-gold" id="transferBtn">Перевести</button>
          <button class="btn btn-outline" id="topupInfo">Пополнить</button>
        </div>
      </div>
      <div class="section">
        <div class="section-title">Последние транзакции</div>
        <div class="transactions">
          ${txns.length === 0 ? '<div class="empty-state"><p>Пока нет операций</p></div>' :
            txns.map(t => {
              const sign = t.amount > 0 ? 'positive' : 'negative';
              const prefix = t.amount > 0 ? '+' : '';
              return `<div class="txn"><span class="txn-desc">${escHtml(t.desc)}</span><span class="txn-amount ${sign}">${prefix}${t.amount} ⭐</span></div>`
            }).join('')
          }
        </div>
      </div>
    `;
    $('#transferBtn')?.addEventListener('click', () => {
      const modal = showModal(`
        <h3>Перевести звезды</h3>
        <div class="info-text">Комиссия 0%. Мгновенный перевод между пользователями GitTG.</div>
        <div class="field">
          <label>Получатель (@username)</label>
          <input type="text" id="transferUsername" placeholder="@username">
        </div>
        <div class="field">
          <label>Количество</label>
          <input type="number" id="transferAmount" placeholder="1" min="1">
        </div>
        <div class="modal-actions">
          <button class="btn btn-secondary" id="transferCancel" style="background:var(--bg3);color:var(--text)">Отмена</button>
          <button class="btn btn-gold" id="transferConfirm">Отправить</button>
        </div>
      `);
      $('#transferCancel')?.addEventListener('click', () => modal.closest('.modal-overlay').remove());
      $('#transferConfirm')?.addEventListener('click', () => {
        const to = $('#transferUsername', modal).value.trim();
        const amt = parseInt($('#transferAmount', modal).value) || 0;
        const res = transferStars(user.id, to, amt);
        if(res.ok) {
          modal.closest('.modal-overlay').remove();
          renderSettingsTab('balance');
          showToast(`Переведено ${amt} ⭐`);
        } else {
          showToast(res.error);
        }
      });
    });
    $('#topupInfo')?.addEventListener('click', () => {
      showModal(`
        <h3>Пополнение баланса</h3>
        <div class="info-text">Свяжитесь с @kostya для покупки звезд или настройте P2P-перевод от другого пользователя. Скоро: интеграция с криптовалютами.</div>
        <div class="modal-actions">
          <button class="btn btn-secondary" style="background:var(--bg3);color:var(--text)" onclick="this.closest('.modal-overlay').remove()">Понятно</button>
        </div>
      `);
    });
  } else if(tabName === 'gifts') {
    const gifts = getUserGifts(user.id);
    const catalog = DB.giftCatalog;
    content.innerHTML = `
      <div class="section">
        <div class="section-title">Мои подарки (${gifts.length})</div>
                    ${gifts.length === 0 ? '<div class="empty-state"><p>У тебя пока нет подарков</p></div>' :
          `<div class="my-gifts">${gifts.map((g,i) => `
            <div class="my-gift">
              <span class="emoji">${g.emoji}</span>
              <span style="font-size:11px;display:block">${escHtml(g.name)}</span>
              <span style="font-size:10px;color:var(--text2);display:block">от ${escHtml(g.fromName)}</span>
              <button class="sell-btn" data-gift-id="${g.id}">Продать за 13⭐</button>
            </div>
          `).join('')}</div>
        }
      </div>
      <div class="section">
        <div class="section-title">Магазин подарков</div>
        <div class="gifts-grid">
          ${catalog.map(g => `
            <div class="gift-card" data-gift-id="${g.id}">
              <div class="emoji">${g.emoji}</div>
              <div class="gift-name">${escHtml(g.name)}</div>
              <div class="gift-price">14 ⭐</div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
    // sell buttons
    $$('.sell-btn', content).forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        const giftId = parseInt(btn.dataset.giftId);
        const res = sellGift(user.id, giftId);
        if(res.ok) {
          renderSettingsTab('gifts');
          showToast('Подарок продан за 13 ⭐', true);
        } else showToast(res.error);
      });
    });
    // buy buttons -> show recipient picker
    $$('.gift-card', content).forEach(card => {
      card.addEventListener('click', () => {
        const giftId = card.dataset.giftId;
        const gift = DB.giftCatalog.find(g=>g.id===giftId);
        if(!gift) return;
        // show recipient picker
        const others = DB.users.filter(u => u.id !== user.id && !u.isBot);
        const modal = showModal(`
          <h3>Кому подарить ${gift.emoji} ${gift.name}?</h3>
          <div class="info-text">Цена: 14 ⭐. После отправки подарок появится у получателя в витрине.</div>
          <div style="max-height:200px;overflow-y:auto">
            ${others.map(u => `
              <div class="search-result-item" data-uid="${u.id}" style="cursor:pointer;padding:8px 12px;border-radius:8px;margin-bottom:4px;background:var(--bg3)">
                <div class="avatar" style="width:36px;height:36px;font-size:14px">${u.name[0]}</div>
                <div class="info">
                  <div class="name">${escHtml(u.name)} ${u.username==='kostya'?showGoldBadge():''}</div>
                  <div class="uname">@${escHtml(u.username)}</div>
                </div>
              </div>
            `).join('')}
          </div>
          <div class="modal-actions">
            <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()" style="background:var(--bg3);color:var(--text)">Отмена</button>
          </div>
        `);
        $$('.search-result-item', modal).forEach(el => {
          el.addEventListener('click', () => {
            const uid = parseInt(el.dataset.uid);
            const res = buyGift(giftId, uid);
            if(res.ok) {
              modal.closest('.modal-overlay').remove();
              showToast(`Подарок ${gift.name} отправлен!`, true);
            } else showToast(res.error);
          });
        });
      });
    });
  } else if(tabName === 'admin') {
    content.innerHTML = `
      <div class="admin-section">
        <h3>⭐ Админ-панель @kostya</h3>
        <div style="display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap;padding:8px 12px;background:var(--bg3);border-radius:8px">
          <div style="flex:1;min-width:120px">
            <div style="font-size:11px;color:var(--text2)">Системный профит</div>
            <div style="font-size:18px;font-weight:600;color:var(--gold)">⭐ ${DB.systemProfit||0}</div>
          </div>
          <div style="flex:1;min-width:120px">
            <div style="font-size:11px;color:var(--text2)">Твой баланс</div>
            <div style="font-size:18px;font-weight:600;color:var(--gold)">⭐ ${user.stars}</div>
          </div>
        </div>
        <div class="field">
          <label>Username пользователя</label>
          <input type="text" id="adminUsername" placeholder="@username">
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px">
          <button class="btn-success" id="adminVerify">Верификация</button>
          <button class="btn-success" id="adminPremium">Premium</button>
        </div>
        <div class="field">
          <label>Начислить звезды</label>
          <input type="number" id="adminStarsAmount" placeholder="Количество" min="1">
        </div>
        <button class="btn-success" id="adminAddStars">Начислить ⭐</button>
      </div>
      <div class="admin-section">
        <h3>📋 Лог действий</h3>
        <div class="log" id="adminLog">> Админ-панель готова</div>
        <button class="btn btn-secondary" id="adminClearLog" style="margin-top:8px;padding:6px 16px;background:var(--bg4);color:var(--text2);border:none;border-radius:6px;cursor:pointer">Очистить лог</button>
      </div>
    `;
    $('#adminVerify')?.addEventListener('click', () => {
      const uname = $('#adminUsername').value.trim();
      const res = verifyUser(uname);
      showToast(res.ok ? `Верификация: ${res.status}` : res.error);
    });
    $('#adminPremium')?.addEventListener('click', () => {
      const uname = $('#adminUsername').value.trim();
      const res = givePremium(uname);
      showToast(res.ok ? `Premium: ${res.status}` : res.error);
    });
    $('#adminAddStars')?.addEventListener('click', () => {
      const uname = $('#adminUsername').value.trim();
      const amt = parseInt($('#adminStarsAmount').value) || 0;
      const res = addStars(uname, amt);
      showToast(res.ok ? `Начислено ${res.delta} ⭐` : res.error);
    });
    $('#adminClearLog')?.addEventListener('click', () => {
      clearLog();
      const el = document.getElementById('adminLog');
      if(el) el.innerHTML = '> Лог очищен';
    });
  }
}

init();