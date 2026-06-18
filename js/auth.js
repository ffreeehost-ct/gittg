// Система авторизации GitTG — регистрация по email / телефону + Telegram
import { DB, getUser, getUserByUsername, getUserByEmail, getUserByPhone } from './data.js';

let currentUser = null;
let currentSession = 0;
// Временные данные регистрации
let regData = { step:'', method:'', email:'', phone:'', code:'', sentCode:'', sentAt:0 };

// === СИСТЕМА ВЕРИФИКАЦИИ ===
function generateCode() {
  return String(100000 + Math.floor(Math.random() * 900000));
}

// Отправка кода на почту (симуляция реального письма)
export function sendEmailCode(email) {
  const code = generateCode();
  regData.sentCode = code;
  regData.sentAt = Date.now();
  regData.email = email;
  // Симулируем отправку — сохраняем код в localStorage для debug
  localStorage.setItem('gittg_last_code', code);
  console.log(`[GitTG MAIL] Код подтверждения для ${email}: ${code}`);
  // На реальном сервере тут был бы вызов API отправки письма
  return { ok: true, msg: 'Код отправлен на почту (в консоли)' };
}

// Отправка кода в Telegram (симуляция сообщения от GitTG Bot)
export function sendTelegramCode(phone) {
  const code = generateCode();
  regData.sentCode = code;
  regData.sentAt = Date.now();
  regData.phone = phone;
  localStorage.setItem('gittg_last_code', code);
  console.log(`[GitTG TG] Код для ${phone}: ${code}. Отправлен через Telegram Bot.`);
  return { ok: true, msg: 'Код отправлен в Telegram (в консоли)' };
}

// Подтверждение кода
export function confirmCode(inputCode) {
  const now = Date.now();
  // Код действителен 10 минут
  if (now - regData.sentAt > 10 * 60 * 1000) {
    return { ok: false, error: 'Код истёк, запроси новый' };
  }
  if (inputCode !== regData.sentCode) {
    return { ok: false, error: 'Неверный код' };
  }
  return { ok: true };
}

// Создание аккаунта после подтверждения кода
export function createAccount(name, username, password) {
  // Проверка уникальности username
  if (getUserByUsername(username)) {
    return { ok: false, error: 'Этот @username уже занят' };
  }
  // Проверка уникальности email/phone
  if (regData.method === 'email' && getUserByEmail(regData.email)) {
    return { ok: false, error: 'Эта почта уже зарегистрирована' };
  }
  if (regData.method === 'phone' && getUserByPhone(regData.phone)) {
    return { ok: false, error: 'Этот номер уже зарегистрирован' };
  }
  
  const newId = DB._userIdCounter++;
  const newUser = {
    id: newId,
    username,
    name,
    bio: '',
    pass: password,
    avatar: null,
    verified: false,
    premium: false,
    stars: 0,
    gifts: [],
    email: regData.method === 'email' ? regData.email : '',
    phone: regData.method === 'phone' ? regData.phone : '',
    regMethod: regData.method,
  };
  DB.users.push(newUser);
  
  // Автоматический вход
  currentUser = newUser;
  if (DB.sessions.length < 3) {
    DB.sessions.unshift({ userId: newUser.id, username: newUser.username });
  } else {
    DB.sessions[2] = { userId: newUser.id, username: newUser.username };
    DB.sessions.unshift(DB.sessions.pop());
  }
  currentSession = 0;
  saveSessions();
  localStorage.removeItem('gittg_last_code');
  return { ok: true, user: newUser };
}

// === СТАНДАРТНАЯ АВТОРИЗАЦИЯ ===
export function getCurrentUser() { return currentUser }
export function getCurrentSession() { return currentSession }
export function getRegData() { return regData }
export function setRegMethod(m) { regData.method = m; regData.step = m + '_input' }
export function getRegStep() { return regData.step }
export function setRegStep(s) { regData.step = s }
export function resetReg() { regData = { step:'', method:'', email:'', phone:'', code:'', sentCode:'', sentAt:0 } }

export function initAuth() {
  const stored = localStorage.getItem('gittg_sessions');
  if (stored) {
    try {
      DB.sessions = JSON.parse(stored);
    } catch(e) { DB.sessions = [] }
  }
  if (DB.sessions.length > 0) {
    currentSession = 0;
    const s = DB.sessions[0];
    const u = getUser(s.userId);
    if (u) currentUser = u;
  }
}

export function saveSessions() {
  localStorage.setItem('gittg_sessions', JSON.stringify(DB.sessions));
}

export function login(username, password) {
  const u = getUserByUsername(username);
  if (!u) return { ok: false, error: 'Пользователь не найден' };
  if (u.isBot) return { ok: false, error: 'Нельзя войти в бота' };
  if (u.pass && u.pass !== password) return { ok: false, error: 'Неверный пароль' };
  
  const existing = DB.sessions.find(s => s.userId === u.id);
  if (!existing) {
    if (DB.sessions.length >= 3) return { ok: false, error: 'Максимум 3 аккаунта' };
    DB.sessions.push({ userId: u.id, username: u.username });
  }
  currentUser = u;
  const idx = DB.sessions.findIndex(s => s.userId === u.id);
  if (idx > 0) {
    const item = DB.sessions.splice(idx, 1)[0];
    DB.sessions.unshift(item);
  }
  currentSession = 0;
  saveSessions();
  return { ok: true };
}

export function switchAccount(idx) {
  if (idx < 0 || idx >= DB.sessions.length) return false;
  const s = DB.sessions[idx];
  const u = getUser(s.userId);
  if (!u) return false;
  const item = DB.sessions.splice(idx, 1)[0];
  DB.sessions.unshift(item);
  currentUser = u;
  currentSession = 0;
  saveSessions();
  return true;
}

export function removeAccount(idx) {
  if (idx < 0 || idx >= DB.sessions.length) return false;
  DB.sessions.splice(idx, 1);
  if (DB.sessions.length === 0) {
    currentUser = null;
  } else {
    const s = DB.sessions[0];
    currentUser = getUser(s.userId);
  }
  currentSession = 0;
  saveSessions();
  return true;
}

export function logout() {
  currentUser = null;
  DB.sessions = [];
  saveSessions();
}

export function isLoggedIn() { return currentUser !== null }
