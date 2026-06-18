import { DB, getUser, getUserByUsername, getChat, getChatTitle, getChatAvatar, getMessages, addMessage } from './data.js';
import { getCurrentUser, getCurrentSession } from './auth.js';
import { showPage, $, $$, escHtml, showToast } from './ui.js';
import { showGoldBadge } from './admin.js';

export function renderChatList() {
  const user = getCurrentUser();
  if(!user) return;
  const list = document.getElementById('chatList');
  if(!list) return;
  const chats = DB.chats.filter(c => c.userIds.includes(user.id));
  chats.sort((a,b) => b.lastTime - a.lastTime);
  list.innerHTML = chats.map(c => {
    const av = getChatAvatar(c, user.id);
    const title = escHtml(getChatTitle(c, user.id));
    const last = escHtml(c.lastMsg||'') || 'Нет сообщений';
    const time = formatTime(c.lastTime);
    const unread = c.unread > 0 ? `<span class="unread">${c.unread}</span>` : '';
    const otherId = c.type==='dm' ? c.userIds.find(id=>id!==user.id) : null;
    const otherUser = otherId ? getUser(otherId) : null;
    const isKostyaChat = otherUser && otherUser.username === 'kostya';
    const typeIcon = c.type==='group'?'👥':c.type==='channel'?'📢':'';
    return `<div class="chat-item" data-chat-id="${c.id}">
      <div class="avatar-wrap">
        <div class="avatar ${c.type==='dm'?'':c.type}">${isKostyaChat ? showGoldBadge() : (av.verified ? '<span class="verified-badge">✓</span>' : escHtml(av.char))}</div>
      </div>
      <div class="info">
        <div class="name">${title} ${av.verified?'<span class="verified">✓</span>':''} ${typeIcon?'<span style="color:var(--text2);font-size:12px">'+typeIcon+'</span>':''}</div>
        <div class="last">${last}</div>
      </div>
      <div class="time">${time}</div>
      ${unread}
    </div>`
  }).join('');
  // click
  $$('.chat-item', list).forEach(el => {
    el.addEventListener('click', () => openChat(parseInt(el.dataset.chatId)));
  });
}

function formatTime(ts) {
  const d = new Date(ts);
  const now = new Date();
  if(d.toDateString()===now.toDateString()) return d.toLocaleTimeString('ru',{hour:'2-digit',minute:'2-digit'});
  return d.toLocaleDateString('ru',{day:'numeric',month:'short'});
}

export function openChat(chatId) {
  const user = getCurrentUser();
  if(!user) return;
  showPage('chatPage');
  const chat = getChat(chatId);
  if(!chat) return;
  
  const title = getChatTitle(chat, user.id);
  const av = getChatAvatar(chat, user.id);
  $('#chatHeaderTitle').textContent = title;
  
  const msgList = document.getElementById('msgList');
  msgList.innerHTML = '';
  
  const msgs = getMessages(chatId);
  msgs.forEach(m => appendMessageDOM(m, user.id));
  
  // scroll
  msgList.scrollTop = msgList.scrollHeight;
  
  // store current chat
  msgList.dataset.chatId = chatId;
  
  // input focus
  const inp = document.getElementById('msgInput');
  inp.value = '';
  inp.focus();
}

function appendMessageDOM(msg, userId) {
  const list = document.getElementById('msgList');
  const div = document.createElement('div');
  const isOut = msg.userId === userId;
  div.className = `message ${isOut?'out':'in'}`;
  const sender = getUser(msg.userId);
  const nameTag = !isOut && sender ? `<div class="name-tag">${escHtml(sender.name)}</div>` : '';
  div.innerHTML = `${nameTag}${escHtml(msg.text)}<div class="time">${formatTime(msg.time)}</div>`;
  list.appendChild(div);
}

export function sendMessage() {
  const inp = document.getElementById('msgInput');
  const text = inp.value.trim();
  if(!text) return;
  const list = document.getElementById('msgList');
  const chatId = parseInt(list.dataset.chatId);
  if(!chatId) return;
  const user = getCurrentUser();
  const msg = addMessage(chatId, user.id, text);
  appendMessageDOM(msg, user.id);
  inp.value = '';
  list.scrollTop = list.scrollHeight;
  // update chat list
  renderChatList();
}

export function searchUsers(query) {
  const q = query.toLowerCase().replace('@','');
  if(!q) return [];
  return DB.users.filter(u => 
    u.username.toLowerCase().includes(q) || 
    u.name.toLowerCase().includes(q)
  );
}

export function startDm(targetUserId) {
  const user = getCurrentUser();
  if(!user) return;
  // check existing dm
  const existing = DB.chats.find(c => 
    c.type==='dm' && c.userIds.includes(user.id) && c.userIds.includes(targetUserId)
  );
  if(existing) {
    openChat(existing.id);
    return;
  }
  // create new dm
  const newId = Math.max(...DB.chats.map(c=>c.id)) + 1;
  DB.chats.push({
    id: newId,
    type: 'dm',
    userIds: [user.id, targetUserId],
    lastMsg: '',
    lastTime: Date.now(),
    unread: 0
  });
  DB.messages[newId] = [];
  openChat(newId);
  renderChatList();
}