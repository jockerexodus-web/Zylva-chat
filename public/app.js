// ================== CONFIG ==================
const EMOJIS = ['😀','😁','😂','🤣','😊','😍','😎','🤔','😅','😉','😢','😭','😡','🥳','🤗','😴','👍','👎','👏','🙏','💪','🔥','❤️','💯','✨','🎉','🧏','🤝','👋','🫶','😇','🥰','🤩','😜','🤪','😋','🤤','🤫','🤭','🫡','🙃','😬','😮','😱','🥺','😤','😈','🤡','👻','💀','🤖','🎃','👽','🐱','🐶','🦊','🐼','🍕','🍔','🍟','🍎','🍩','☕','🍺','🌈','⭐','💫','🌙','☀️','🌊','🍀','🌸'];

const CODE_EXPIRY_MS = 10 * 60 * 1000; // 10 min
const RESEND_COOLDOWN_S = 30;
const MAX_ATTEMPTS = 5;

// ================== ÉTAT ==================
let currentUser = null;
let currentEmail = null;
let expectedCode = null;
let codeCreatedAt = null;
let codeAttempts = 0;
let currentChat = null;
let users = {};
let messages = [];
let resendInterval = null;
let isDemoMode = false;

const channel = new BroadcastChannel('zylva_chat');

// ================== DOM ==================
const $ = (id) => document.getElementById(id);
const emailScreen = $('emailScreen');
const codeScreen = $('codeScreen');
const profileScreen = $('profileScreen');
const appScreen = $('appScreen');
const emailInput = $('emailInput');
const sendCodeBtn = $('sendCodeBtn');
const displayEmail = $('displayEmail');
const shownCode = $('shownCode');
const demoCode = $('demoCode');
const codeInputs = document.querySelectorAll('#codeInputs input');
const verifyBtn = $('verifyBtn');
const resendBtn = $('resendBtn');
const cooldownEl = $('cooldown');
const backBtn = $('backBtn');
const usernameInput = $('usernameInput');
const finishBtn = $('finishBtn');
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

function showToast(msg, isError = false, duration = 3000) {
  toast.textContent = msg;
  toast.classList.toggle('error', isError);
  toast.classList.remove('hidden');
  setTimeout(() => toast.classList.add('show'), 10);
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.classList.add('hidden'), 300);
  }, duration);
}

function isMobile() { return window.innerWidth <= 768; }

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function generateCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

// ================== ÉTAPE 1 : ENVOI CODE ==================
emailInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') sendCode();
});
sendCodeBtn.onclick = sendCode;

async function sendCode() {
  const email = emailInput.value.trim().toLowerCase();

  if (!isValidEmail(email)) {
    emailInput.classList.add('error');
    showToast('❌ Email invalide', true);
    setTimeout(() => emailInput.classList.remove('error'), 1500);
    return;
  }

  currentEmail = email;
  displayEmail.textContent = email;
  expectedCode = generateCode();
  codeCreatedAt = Date.now();
  codeAttempts = 0;

  sendCodeBtn.disabled = true;
  sendCodeBtn.classList.add('loading');
  sendCodeBtn.textContent = 'Envoi en cours...';

  const sent = await sendEmailCode(email, expectedCode);

  sendCodeBtn.disabled = false;
  sendCodeBtn.classList.remove('loading');
  sendCodeBtn.textContent = 'Recevoir le code';

  if (!sent) {
    showToast('❌ Erreur d\'envoi, réessaie', true);
    return;
  }

  showToast('📧 Code envoyé ! Vérifie ta boîte mail');

  codeInputs.forEach(i => { i.value = ''; i.classList.remove('filled', 'error'); });
  codeInputs[0].focus();
  showScreen(codeScreen);
  startResendCooldown();
}

// ================== ENVOI EMAIL (3 méthodes) ==================
async function sendEmailCode(email, code) {
  // Mode démo
  if (EMAIL_CONFIG.demo.active) {
    isDemoMode = true;
    demoCode.classList.remove('hidden');
    shownCode.textContent = code;
    console.log(`📧 [DEMO] Code pour ${email} : ${code}`);
    return true;
  }

  // EmailJS
  if (EMAIL_CONFIG.emailjs.active) {
    try {
      // Charger EmailJS dynamiquement
      if (!window.emailjs) {
        await loadScript('https://cdn.jsdelivr.net/npm/@emailjs/browser@4/dist/email.min.js');
        emailjs.init(EMAIL_CONFIG.emailjs.publicKey);
      }

      await emailjs.send(
        EMAIL_CONFIG.emailjs.serviceId,
        EMAIL_CONFIG.emailjs.templateId,
        {
          to_email: email,
          email: email,
          code: code,
          app_name: 'Zylva Labs'
        }
      );
      console.log('✅ Email envoyé via EmailJS');
      return true;
    } catch (err) {
      console.error('❌ EmailJS:', err);
      return false;
    }
  }

  // Resend (backend)
  if (EMAIL_CONFIG.resend.active) {
    try {
      const res = await fetch(EMAIL_CONFIG.resend.apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        console.error('❌ Backend:', data);
        return false;
      }
      console.log('✅ Email envoyé via Resend');
      return true;
    } catch (err) {
      console.error('❌ Resend fetch:', err);
      return false;
    }
  }

  console.warn('⚠️ Aucune méthode email active — active demo dans email-config.js');
  return false;
}

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src;
    s.onload = resolve;
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

// ================== COOLDOWN RESEND ==================
function startResendCooldown() {
  let remaining = RESEND_COOLDOWN_S;
  resendBtn.disabled = true;
  cooldownEl.textContent = remaining;

  if (resendInterval) clearInterval(resendInterval);
  resendInterval = setInterval(() => {
    remaining--;
    cooldownEl.textContent = remaining;
    if (remaining <= 0) {
      clearInterval(resendInterval);
      resendBtn.disabled = false;
      resendBtn.textContent = 'Renvoyer le code';
    }
  }, 1000);
}

resendBtn.onclick = async () => {
  if (resendBtn.disabled) return;

  // Reset code
  expectedCode = generateCode();
  codeCreatedAt = Date.now();
  codeAttempts = 0;

  if (isDemoMode) {
    shownCode.textContent = expectedCode;
    console.log(`📧 [DEMO] Nouveau code : ${expectedCode}`);
  }

  showToast('📧 Nouveau code envoyé...');

  const sent = await sendEmailCode(currentEmail, expectedCode);
  if (!sent) {
    showToast('❌ Erreur d\'envoi', true);
    return;
  }

  codeInputs.forEach(i => { i.value = ''; i.classList.remove('filled', 'error'); });
  codeInputs[0].focus();
  showToast('📧 Nouveau code envoyé !');
  startResendCooldown();
};

backBtn.onclick = () => {
  if (resendInterval) clearInterval(resendInterval);
  showScreen(emailScreen);
  emailInput.focus();
};

// ================== ÉTAPE 2 : VÉRIFICATION CODE ==================
codeInputs.forEach((input, idx) => {
  input.addEventListener('input', (e) => {
    const val = e.target.value.replace(/\D/g, '');
    e.target.value = val;
    if (val) {
      e.target.classList.add('filled');
      if (idx < codeInputs.length - 1) codeInputs[idx + 1].focus();
      if (idx === codeInputs.length - 1) checkComplete();
    } else {
      e.target.classList.remove('filled');
    }
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Backspace' && !e.target.value && idx > 0) {
      codeInputs[idx - 1].focus();
    }
  });

  input.addEventListener('paste', (e) => {
    e.preventDefault();
    const pasted = (e.clipboardData.getData('text') || '').replace(/\D/g, '').slice(0, 6);
    [...pasted].forEach((digit, i) => {
      if (codeInputs[i]) {
        codeInputs[i].value = digit;
        codeInputs[i].classList.add('filled');
      }
    });
    if (pasted.length === 6) checkComplete();
  });
});

function getEnteredCode() {
  return [...codeInputs].map(i => i.value).join('');
}

function checkComplete() {
  if (getEnteredCode().length === 6) verifyCode();
}

verifyBtn.onclick = verifyCode;

async function verifyCode() {
  const code = getEnteredCode();

  if (code.length !== 6) {
    showToast('❌ Code incomplet', true);
    return;
  }

  // Vérifier expiration
  if (Date.now() - codeCreatedAt > CODE_EXPIRY_MS) {
    showToast('❌ Code expiré, renvoie-le', true);
    shakeCode();
    return;
  }

  // Vérifier tentatives
  codeAttempts++;
  if (codeAttempts > MAX_ATTEMPTS) {
    showToast('❌ Trop de tentatives, renvoie un code', true);
    resendBtn.disabled = false;
    return;
  }

  // Vérifier le code
  if (code !== expectedCode) {
    showToast(`❌ Code incorrect (${MAX_ATTEMPTS - codeAttempts + 1} essais restants)`, true);
    shakeCode();
    return;
  }

  // ✅ SUCCÈS
  verifyBtn.disabled = true;
  verifyBtn.textContent = '✅ Vérifié !';

  setTimeout(() => {
    verifyBtn.disabled = false;
    verifyBtn.textContent = 'Vérifier';

    // Vérifier si le compte existe
    const accounts = JSON.parse(localStorage.getItem('zylva_accounts') || '{}');
    const existing = accounts[currentEmail];

    if (existing && existing.username) {
      currentUser = existing.username;
      showToast(`👋 Bon retour, ${currentUser} !`);
      setTimeout(() => enterApp(), 400);
    } else {
      showScreen(profileScreen);
      usernameInput.focus();
    }
  }, 400);
}

function shakeCode() {
  codeInputs.forEach(i => i.classList.add('error'));
  setTimeout(() => {
    codeInputs.forEach(i => {
      i.classList.remove('error');
      i.value = '';
      i.classList.remove('filled');
    });
    codeInputs[0].focus();
  }, 400);
}

// ================== ÉTAPE 3 : PSEUDO ==================
usernameInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') finishSignup();
});
finishBtn.onclick = finishSignup;

function finishSignup() {
  const name = usernameInput.value.trim();

  if (name.length < 2) {
    showToast('❌ Pseudo trop court (min 2)', true);
    return;
  }
  if (name.length > 20) {
    showToast('❌ Pseudo trop long (max 20)', true);
    return;
  }

  const accounts = JSON.parse(localStorage.getItem('zylva_accounts') || '{}');

  // Vérifier unicité
  if (Object.values(accounts).some(a => a.username.toLowerCase() === name.toLowerCase())) {
    showToast('❌ Ce pseudo est déjà pris', true);
    return;
  }

  accounts[currentEmail] = {
    username: name,
    email: currentEmail,
    createdAt: Date.now()
  };
  localStorage.setItem('zylva_accounts', JSON.stringify(accounts));

  currentUser = name;
  showToast(`🎉 Bienvenue ${name} !`);

  setTimeout(() => enterApp(), 400);
}

// ================== ENTRÉE APP ==================
function enterApp() {
  currentUserEl.textContent = currentUser;
  userAvatar.textContent = currentUser[0].toUpperCase();
  showScreen(appScreen);
  startLocalListeners();
  messageInput.focus();
  if (isMobile()) sidebar.classList.remove('hidden-mobile');
}

// ================== LOCAL LISTENERS ==================
function startLocalListeners() {
  users = JSON.parse(localStorage.getItem('zylva_users') || '{}');
  messages = JSON.parse(localStorage.getItem('zylva_messages') || '[]');

  if (!users[currentUser]) {
    users[currentUser] = { joined: Date.now(), email: currentEmail };
    saveLocalUsers();
  }

  channel.postMessage({ type: 'user_join', user: currentUser });
  loadContacts();
  renderMessages();
}

function saveLocalUsers() { localStorage.setItem('zylva_users', JSON.stringify(users)); }
function saveLocalMessages() { localStorage.setItem('zylva_messages', JSON.stringify(messages)); }

channel.onmessage = (e) => {
  const data = e.data;
  if (data.type === 'message') {
    if (!messages.find(m => m.id === data.message.id)) {
      messages.push(data.message);
      saveLocalMessages();
      renderMessages();
      loadContacts();
    }
  }
  if (data.type === 'user_join') {
    users[data.user] = users[data.user] || { joined: Date.now() };
    saveLocalUsers();
    loadContacts();
  }
};

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

// ================== LOGOUT ==================
logoutBtn.onclick = () => {
  if (!confirm('Quitter Zylva Labs ?')) return;
  channel.postMessage({ type: 'user_leave', user: currentUser });
  currentUser = null;
  currentEmail = null;
  currentChat = null;
  expectedCode = null;
  emailInput.value = '';
  usernameInput.value = '';
  codeInputs.forEach(i => { i.value = ''; i.classList.remove('filled'); });
  if (resendInterval) clearInterval(resendInterval);
  showScreen(emailScreen);
};

// ================== CONTACTS ==================
function loadContacts() {
  contactList.innerHTML = '';

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

  Object.keys(users).forEach(name => {
    if (name === currentUser) return;
    const li = document.createElement('li');
    li.className = currentChat === name ? 'active' : '';
    const lastMsg = getLastMessageWith(name);
    li.innerHTML = `
      <div class="contact-avatar">${name[0].toUpperCase()}</div>
      <div class="contact-info">
        <div class="contact-name">${name}</div>
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
  return msgs.length ? msgs[msgs.length - 1].text : '';
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
  saveLocalMessages();
  channel.postMessage({ type: 'message', message: msg });

  messageInput.value = '';
  renderMessages();
  loadContacts();
}

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

// ================== SERVICE WORKER ==================
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(err => console.warn('SW:', err));
  });
}

// ================== FOCUS AUTO ==================
window.addEventListener('load', () => {
  emailInput.focus();
});
