// ================== CONFIG ==================
const EMOJIS = ['😀','😁','😂','🤣','😊','😍','😎','🤔','😅','😉','😢','😭','😡','🥳','🤗','😴','👍','👎','👏','🙏','💪','🔥','❤️','💯','✨','🎉','🧏','🤝','👋','🫶','😇','🥰','🤩','😜','🤪','😋','🤤','🤫','🤭','🫡','🙃','😬','😮','😱','🥺','😤','😈','🤡','👻','💀','🤖','🎃','👽','🐱','🐶','🦊','🐼','🍕','🍔','🍟','🍎','🍩','☕','🍺','🌈','⭐','💫','🌙','☀️','🌊','🍀','🌸'];

// ================== ÉTAT ==================
let currentUser = null;
let currentChat = null;
let users = JSON.parse(localStorage.getItem('zylva_users') || '{}');
let messages = JSON.parse(localStorage.getItem('zylva_messages') || '[]');
const channel = new BroadcastChannel('zylva_chat');

// ================== DOM ==================
const $ = (id) => document.getElementById(id);
const loginScreen = $('loginScreen');
const appScreen = $('appScreen');
const usernameInput = $('usernameInput');
const enterBtn = $('enterBtn');
const currentUserEl = $('currentUser');
const userAvatar = $('userAvatar');
const logoutBtn = $('logoutBtn');
const contactList = $('contactList');
const messagesEl = $('messages');
const messageInput = $('messageInput');
const sendBtn = $('sendBtn');
const chatWith = $('chatWith');
const searchInput = $('searchInput');
const emojiBtn = $('emojiBtn');
const emojiPicker = $('emojiPicker');
const toast = $('toast');
const sidebar = $('sidebar');
const backToSidebar = $('backToSidebar');

// ================== HELPERS ==================
function showScreen(screen) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  screen.classList.add('active');
}

function showToast(msg, duration = 2500) {
  toast.textContent = msg;
  toast.classList.remove('hidden');
  setTimeout(() => toast.classList.add('show'), 10);
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.classList.add('hidden'), 300);
  }, duration);
}

function isMobile() { return window.innerWidth <= 768; }

function saveUsers() { localStorage.setItem('zylva_users', JSON.stringify(users)); }
function saveMessages() { localStorage.setItem('zylva_messages', JSON.stringify(messages)); }

// ================== CONNEXION ==================
enterBtn.onclick = login;
usernameInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') login();
});

function login() {
  const name = usernameInput.value.trim();

  if (name.length < 2) {
    usernameInput.classList.add('error');
    showToast('❌ Pseudo trop court (min 2)');
    setTimeout(() => usernameInput.classList.remove('error'), 1500);
    return;
  }

  if (name.length > 20) {
    showToast('❌ Pseudo trop long (max 20)');
    return;
  }

  // Vérifier si le pseudo est déjà utilisé par quelqu'un d'autre
  const existing = Object.keys(users).find(u =>
    u.toLowerCase() === name.toLowerCase() && u !== name
  );
  if (existing) {
    showToast(`❌ "${name}" est déjà pris, choisis un autre`);
    return;
  }

  currentUser = name;
  users[name] = users[name] || { joined: Date.now() };
  saveUsers();

  channel.postMessage({ type: 'user_join', user: name });

  currentUserEl.textContent = name;
  userAvatar.textContent = name[0].toUpperCase();

  showScreen(appScreen);
  loadContacts();
  renderMessages();
  messageInput.focus();

  if (isMobile()) sidebar.classList.remove('hidden-mobile');
}

// ================== DÉCONNEXION ==================
logoutBtn.onclick = () => {
  if (!confirm('Quitter Zylva Labs ?')) return;
  channel.postMessage({ type: 'user_leave', user: currentUser });
  currentUser = null;
  currentChat = null;
  usernameInput.value = '';
  showScreen(loginScreen);
  usernameInput.focus();
};

// ================== CONTACTS ==================
function loadContacts() {
  contactList.innerHTML = '';

  // Chat général
  const generalLi = document.createElement('li');
  generalLi.className = currentChat === null ? 'active' : '';
  generalLi.innerHTML = `
    <div class="contact-avatar" style="color:var(--cyan);">🌍</div>
    <div class="contact-info">
      <div class="contact-name">Chat général</div>
      <div class="contact-preview">Tout le monde</div>
    </div>
  `;
  generalLi.onclick = () => selectChat(null);
  contactList.appendChild(generalLi);

  // Autres utilisateurs
  Object.keys(users).forEach(name => {
    if (name === currentUser) return;
    const li = document.createElement('li');
    li.className = currentChat === name ? 'active' : '';
    const lastMsg = getLastMessageWith(name);
    li.innerHTML = `
      <div class="contact-avatar">${name[0].toUpperCase()}</div>
      <div class="contact-info">
        <div class="contact-name">${escapeHtml(name)}</div>
        <div class="contact-preview">${lastMsg || 'Nouvelle discussion'}</div>
      </div>
    `;
    li.onclick = () => selectChat(name);
    contactList.appendChild(li);
  });
}

function getLastMessageWith(name) {
  const msgs = messages.filter(m =>
    (m.from === currentUser && m.to === name) ||
    (m.from === name && m.to === currentUser)
  );
  return msgs.length ? escapeHtml(msgs[msgs.length - 1].text) : '';
}

function selectChat(name) {
  currentChat = name;
  chatWith.textContent = name === null ? '🌍 Chat général' : `💬 ${name}`;
  if (isMobile()) sidebar.classList.add('hidden-mobile');
  loadContacts();
  renderMessages();
  messageInput.focus();
}

backToSidebar.onclick = () => {
  sidebar.classList.remove('hidden-mobile');
};

// ================== MESSAGES ==================
function renderMessages() {
  messagesEl.innerHTML = '';
  const relevant = messages.filter(m => {
    if (currentChat === null) return m.to === null;
    return (m.from === currentUser && m.to === currentChat) ||
           (m.from === currentChat && m.to === currentUser);
  });

  if (relevant.length === 0) {
    messagesEl.innerHTML = `
      <div class="empty-state">
        <img src="logo.svg" alt="" class="empty-logo">
        <p>Aucun message</p>
        <p class="small">Écris le premier message !</p>
      </div>
    `;
    return;
  }

  relevant.forEach(m => {
    const div = document.createElement('div');
    const isSent = m.from === currentUser;
    div.className = `message ${isSent ? 'sent' : 'received'}`;
    const time = new Date(m.time).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    div.innerHTML = `
      ${!isSent && currentChat === null ? `<div class="sender">${escapeHtml(m.from)}</div>` : ''}
      <div>${escapeHtml(m.text)}</div>
      <div class="meta">${time} ${isSent ? '✓✓' : ''}</div>
    `;
    messagesEl.appendChild(div);
  });

  messagesEl.scrollTop = messagesEl.scrollHeight;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML.replace(/\n/g, '<br>');
}

// ================== ENVOI ==================
sendBtn.onclick = sendMessage;
messageInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') sendMessage();
});

function sendMessage() {
  const text = messageInput.value.trim();
  if (!text || !currentUser) return;

  const msg = {
    id: Date.now() + Math.random(),
    from: currentUser,
    to: currentChat,
    text,
    time: Date.now()
  };

  messages.push(msg);
  saveMessages();
  channel.postMessage({ type: 'message', message: msg });

  messageInput.value = '';
  renderMessages();
  loadContacts();
}

// ================== RÉCEPTION ==================
channel.onmessage = (e) => {
  const data = e.data;

  if (data.type === 'message') {
    if (!messages.find(m => m.id === data.message.id)) {
      messages.push(data.message);
      saveMessages();
      renderMessages();
      loadContacts();
    }
  }

  if (data.type === 'user_join') {
    if (!users[data.user]) {
      users[data.user] = { joined: Date.now() };
      saveUsers();
      loadContacts();
    }
  }
};

// ================== SYNC AUTRES ONGLETS ==================
window.addEventListener('storage', (e) => {
  if (e.key === 'zylva_messages') {
    messages = JSON.parse(e.newValue || '[]');
    renderMessages();
    loadContacts();
  }
  if (e.key === 'zylva_users') {
    users = JSON.parse(e.newValue || '{}');
    loadContacts();
  }
});

// ================== RECHERCHE ==================
searchInput.addEventListener('input', () => {
  const q = searchInput.value.toLowerCase();
  document.querySelectorAll('#contactList li').forEach(li => {
    const name = li.querySelector('.contact-name')?.textContent.toLowerCase() || '';
    li.style.display = name.includes(q) ? 'flex' : 'none';
  });
});

// ================== EMOJIS ==================
EMOJIS.forEach(e => {
  const span = document.createElement('span');
  span.textContent = e;
  span.onclick = () => {
    messageInput.value += e;
    messageInput.focus();
  };
  emojiPicker.appendChild(span);
});

emojiBtn.onclick = (e) => {
  e.stopPropagation();
  emojiPicker.classList.toggle('hidden');
};
document.addEventListener('click', (e) => {
  if (!emojiPicker.contains(e.target) && e.target !== emojiBtn) {
    emojiPicker.classList.add('hidden');
  }
});

// ================== PWA ==================
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(err => console.warn('SW:', err));
  });
}

// ================== AUTO-FOCUS ==================
window.addEventListener('load', () => {
  usernameInput.focus();
});
