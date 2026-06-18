export const DB = {
  users: [
    { id:1, username:'kostya', name:'Костя', bio:'Создатель GitTG', pass:'123', avatar:null, verified:true, premium:true, stars:99999, gifts:[], isAdmin:true },
    { id:2, username:'alice', name:'Алиса', bio:'Дизайнер', pass:'123', avatar:null, verified:false, premium:false, stars:70, gifts:[] },
    { id:3, username:'bob', name:'Боб', bio:'Разработчик', pass:'123', avatar:null, verified:false, premium:false, stars:42, gifts:[] },
    { id:4, username:'BotFather', name:'BotFather', bio:'Официальный бот для управления ботами', pass:'', avatar:null, verified:true, premium:false, stars:0, gifts:[], isBot:true },
  ],
  chats: [
    { id:101, type:'dm', userIds:[1,2], lastMsg:'привет!', lastTime:Date.now()-60000, unread:0 },
    { id:102, type:'dm', userIds:[1,3], lastMsg:'го делать гифт?', lastTime:Date.now()-120000, unread:1 },
    { id:103, type:'group', name:'GitTG Team', avatar:null, userIds:[1,2,3], lastMsg:'Костя: обновил дизайн)', lastTime:Date.now()-300000, unread:3 },
    { id:104, type:'channel', name:'GitTG News', avatar:null, userIds:[1], lastMsg:'Новое обновление: Подарки и Звезды!', lastTime:Date.now()-3600000, unread:0 },
  ],
  messages: {},
  transactions: [],
  giftCatalog: [
    { id:'g1', emoji:'🌹', name:'Роза' },
    { id:'g2', emoji:'🎂', name:'Тортик' },
    { id:'g3', emoji:'❤️', name:'Сердечко' },
    { id:'g4', emoji:'🎮', name:'Геймпад' },
    { id:'g5', emoji:'🐱', name:'Котик' },
    { id:'g6', emoji:'🎁', name:'Сюрприз' },
    { id:'g7', emoji:'💎', name:'Алмаз' },
    { id:'g8', emoji:'🚀', name:'Ракета' },
    { id:'g9', emoji:'🌈', name:'Радуга' },
    { id:'g10', emoji:'🌟', name:'Звезда' },
  ],
  sessions: [],
  // 🗄️ Таблицы БД (звезды и подарки)
  stars_balance: [],  // { userId, balance }
  user_gifts: [],     // { id, userId, giftId, emoji, name, fromUserId, fromName, receivedAt }
  // Системный профит (1 звезда с каждой продажи подарка — принадлежит @kostya)
  systemProfit: 0,
  // Уникальные giftId (автоинкремент)
  _giftInstanceId: 0
};

export function getUser(id) { return DB.users.find(u=>u.id===id) }
export function getUserByUsername(uname) { return DB.users.find(u=>u.username===uname.replace('@','')) }
export function getUserByEmail(email) { return DB.users.find(u=>u.email===email) }
export function getUserByPhone(phone) { return DB.users.find(u=>u.phone===phone) }
export function getChat(id) { return DB.chats.find(c=>c.id===id) }
export function getChatTitle(chat, userId) {
  if(chat.type==='dm') {
    const other = chat.userIds.find(id=>id!==userId)
    const u = getUser(other)
    return u ? u.name : 'Unknown'
  }
  return chat.name || 'Chat'
}
export function getChatAvatar(chat, userId) {
  if(chat.type==='dm') {
    const other = chat.userIds.find(id=>id!==userId)
    const u = getUser(other)
    return { char: u ? u.name[0] : '?', verified: u?.verified, online: true }
  }
  return { char: chat.name ? chat.name[0] : 'G', verified: false, online: false }
}
export function getMessages(chatId) {
  if(!DB.messages[chatId]) DB.messages[chatId]=[]
  return DB.messages[chatId]
}
export function addMessage(chatId, userId, text) {
  const msg = { id:Date.now(), chatId, userId, text, time:Date.now() }
  if(!DB.messages[chatId]) DB.messages[chatId]=[]
  DB.messages[chatId].push(msg)
  const chat = getChat(chatId)
  if(chat) {
    chat.lastMsg = text
    chat.lastTime = Date.now()
  }
  return msg
}
export function addTransaction(userId, type, amount, desc) {
  const t = { id:Date.now(), userId, type, amount, desc, time:Date.now() }
  DB.transactions.push(t)
  return t
}
export function getBalance(userId) {
  const u = getUser(userId)
  return u ? u.stars : 0
}
export function changeBalance(userId, delta) {
  const u = getUser(userId)
  if(!u) return false
  u.stars = Math.max(0, u.stars + delta)
  return true
}