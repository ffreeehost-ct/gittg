import { DB, getUser, getUserByUsername, changeBalance, addTransaction } from './data.js';
import { showToast } from './ui.js';

let log = [];

function addLog(msg) {
  log.push(msg);
  const el = document.getElementById('adminLog');
  if(el) el.innerHTML = log.map(l=>`> ${l}`).join('\n');
}

export function isAdmin(user) {
  // 🛡️ Жесткая проверка по @username (ТЗ: if(user.username === 'kostya'))
  return user && (user.username === 'kostya' || user.isAdmin === true);
}

// Золотая звезда/галочка — только для @kostya
export function isSuperAdmin(user) {
  return user && user.username === 'kostya';
}

export function showGoldBadge() {
  return '<span class="gold-star" title="Создатель GitTG">⭐</span>';
}

export function verifyUser(username) {
  const u = getUserByUsername(username);
  if(!u) return { ok:false, error:'Пользователь не найден' };
  u.verified = !u.verified;
  const status = u.verified ? 'выдана' : 'снята';
  addLog(`Верификация ${status} для @${u.username}`);
  return { ok:true, status };
}

export function givePremium(username) {
  const u = getUserByUsername(username);
  if(!u) return { ok:false, error:'Пользователь не найден' };
  u.premium = !u.premium;
  const status = u.premium ? 'выдан' : 'снят';
  addLog(`Premium ${status} для @${u.username}`);
  return { ok:true, status };
}

export function addStars(username, amount) {
  if(!amount || amount<1) return { ok:false, error:'Некорректная сумма' };
  const u = getUserByUsername(username);
  if(!u) return { ok:false, error:'Пользователь не найден' };
  const delta = Math.floor(amount);
  changeBalance(u.id, delta);
  addTransaction(u.id, 'admin_add', delta, `Начислено админом: +${delta} ⭐`);
  addLog(`Начислено ${delta} ⭐ для @${u.username}`);
  return { ok:true, delta };
}

export function getAdminLog() { return log; }
export function clearLog() { log = []; }