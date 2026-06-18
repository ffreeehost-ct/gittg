import { DB, getUser, getUserByUsername } from './data.js';

let currentUser = null;
let currentSession = 0;

export function getCurrentUser() { return currentUser }
export function getCurrentSession() { return currentSession }

export function initAuth() {
  const stored = localStorage.getItem('gittg_sessions');
  if(stored) {
    try {
      DB.sessions = JSON.parse(stored);
    } catch(e) { DB.sessions = [] }
  }
  if(DB.sessions.length > 0) {
    currentSession = 0;
    const s = DB.sessions[0];
    const u = getUser(s.userId);
    if(u) currentUser = u;
  }
}

export function saveSessions() {
  localStorage.setItem('gittg_sessions', JSON.stringify(DB.sessions));
}

export function login(username, password) {
  const u = getUserByUsername(username);
  if(!u) return { ok:false, error:'Пользователь не найден' };
  if(u.isBot) return { ok:false, error:'Нельзя войти в бота' };
  if(u.pass && u.pass !== password) return { ok:false, error:'Неверный пароль' };
  // check if already signed
  const existing = DB.sessions.find(s => s.userId === u.id);
  if(!existing) {
    if(DB.sessions.length >= 3) return { ok:false, error:'Максимум 3 аккаунта' };
    DB.sessions.push({ userId:u.id, username:u.username });
  }
  currentUser = u;
  // reorder: move to first
  const idx = DB.sessions.findIndex(s => s.userId === u.id);
  if(idx > 0) {
    const item = DB.sessions.splice(idx, 1)[0];
    DB.sessions.unshift(item);
  }
  currentSession = 0;
  saveSessions();
  return { ok:true };
}

export function switchAccount(idx) {
  if(idx < 0 || idx >= DB.sessions.length) return false;
  const s = DB.sessions[idx];
  const u = getUser(s.userId);
  if(!u) return false;
  // reorder
  const item = DB.sessions.splice(idx, 1)[0];
  DB.sessions.unshift(item);
  currentUser = u;
  currentSession = 0;
  saveSessions();
  return true;
}

export function removeAccount(idx) {
  if(idx < 0 || idx >= DB.sessions.length) return false;
  DB.sessions.splice(idx, 1);
  if(DB.sessions.length === 0) {
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