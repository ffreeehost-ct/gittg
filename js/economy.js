import { DB, getUser, getUserByUsername, changeBalance, addTransaction, getBalance } from './data.js';
import { getCurrentUser } from './auth.js';
import { showToast } from './ui.js';

const GIFT_PRICE = 14;
const GIFT_SELL = 13;

// 🆕 Функция sendGift(from_user, to_user, gift_id) — по ТЗ
export function sendGift(from_user, to_user, gift_id) {
  const sender = typeof from_user === 'object' ? from_user : getUser(from_user);
  const recipient = typeof to_user === 'object' ? to_user : getUser(to_user);
  if(!sender) return { ok:false, error:'Отправитель не найден' };
  if(!recipient) return { ok:false, error:'Получатель не найден' };
  if(sender.stars < GIFT_PRICE) return { ok:false, error:'Недостаточно звезд. Нужно 14' };
  
  const gift = DB.giftCatalog.find(g=>g.id===gift_id);
  if(!gift) return { ok:false, error:'Подарок не найден в каталоге' };

  // Списываем 14 звезд у отправителя
  changeBalance(sender.id, -GIFT_PRICE);
  
  // Создаем запись подарка с уникальным instanceId
  const instanceId = ++DB._giftInstanceId;
  const giftEntry = {
    id: instanceId,
    giftId: gift.id,
    emoji: gift.emoji,
    name: gift.name,
    fromUserId: sender.id,
    fromName: sender.name,
    receivedAt: Date.now()
  };

  // 🗄️ Таблица user_gifts
  DB.user_gifts.push(giftEntry);
  // Также храним в пользователе для совместимости
  if(!recipient.gifts) recipient.gifts = [];
  recipient.gifts.push(giftEntry);

  // 🗄️ Таблица stars_balance (синхронизация)
  syncStarsBalance(sender.id);
  syncStarsBalance(recipient.id);

  addTransaction(sender.id, 'gift_sent', -GIFT_PRICE, `Подарок "${gift.name}" для ${recipient.name}`);
  addTransaction(recipient.id, 'gift_received', 0, `Подарок "${gift.name}" от ${sender.name}`);
  return { ok:true, giftId: instanceId };
}

// 🆕 Функция sellGift(user_id, gift_id) — по ТЗ (работает по ID подарка, не по индексу)
export function sellGift(userId, giftId) {
  const u = getUser(userId);
  if(!u) return { ok:false, error:'Пользователь не найден' };
  
  // Ищем подарок по его instanceId (giftId) в массиве пользователя
  const idx = (u.gifts || []).findIndex(g => g.id === giftId);
  if(idx === -1) return { ok:false, error:'Подарок не найден' };
  
  const gift = u.gifts[idx];
  u.gifts.splice(idx, 1);
  
  // Также удаляем из таблицы user_gifts
  const tIdx = DB.user_gifts.findIndex(g => g.id === giftId);
  if(tIdx !== -1) DB.user_gifts.splice(tIdx, 1);

  // 💰 Начисляем 13 звезд пользователю
  changeBalance(userId, GIFT_SELL);
  
  // 💰 1 звезда — в системный профит (@kostya)
  DB.systemProfit = (DB.systemProfit || 0) + 1;
  
  syncStarsBalance(userId);

  addTransaction(userId, 'gift_sold', GIFT_SELL, `Продан подарок "${gift.name}"`);
  return { ok:true, profit: GIFT_SELL, commission: 1 };
}

// Синхронизация stars_balance таблицы с полем user.stars
export function syncStarsBalance(userId) {
  const u = getUser(userId);
  if(!u) return;
  const idx = DB.stars_balance.findIndex(sb => sb.userId === userId);
  if(idx !== -1) {
    DB.stars_balance[idx].balance = u.stars;
  } else {
    DB.stars_balance.push({ userId, balance: u.stars });
  }
}

// Совместимость: старый buyGift вызывает новый sendGift
export function buyGift(giftId, recipientId) {
  const user = getCurrentUser();
  if(!user) return { ok:false, error:'Не авторизован' };
  const recipient = getUser(recipientId);
  if(!recipient) return { ok:false, error:'Получатель не найден' };
  return sendGift(user, recipient, giftId);
}

export function transferStars(senderId, recipientUsername, amount) {
  if(amount < 1) return { ok:false, error:'Минимум 1 звезда' };
  if(!Number.isInteger(amount)) return { ok:false, error:'Целое число' };
  const sender = getUser(senderId);
  if(!sender) return { ok:false, error:'Отправитель не найден' };
  if(sender.stars < amount) return { ok:false, error:'Недостаточно звезд' };
  const recipient = getUserByUsername(recipientUsername);
  if(!recipient) return { ok:false, error:'Получатель не найден' };
  if(recipient.id === senderId) return { ok:false, error:'Нельзя перевести себе' };

  changeBalance(senderId, -amount);
  changeBalance(recipient.id, amount);
  addTransaction(senderId, 'transfer_out', -amount, `Перевод ${recipient.name} (@${recipient.username})`);
  addTransaction(recipient.id, 'transfer_in', amount, `Перевод от ${sender.name} (@${sender.username})`);
  return { ok:true };
}

export function getTransactions(userId) {
  return DB.transactions.filter(t=>t.userId===userId).sort((a,b)=>b.time-a.time);
}

export function getUserGifts(userId) {
  const u = getUser(userId);
  return u?.gifts || [];
}