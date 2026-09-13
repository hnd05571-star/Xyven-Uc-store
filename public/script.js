/* =========================================================
   XYVEN UC STORE - Main Script (with Auth + Notifications)
   ========================================================= */

const CONFIG = {
  API_BASE: '',
  INTRO_DURATION: 12,
  UPI_ID: 'harshsinghs@fam',
  UPI_NAME: 'XYVEN UC Store',
  MIN_DEPOSIT: 200,
  TIMER_SECONDS: 150,
};

// ============ COUPONS (hidden from UI) ============
// Special member codes - never shown in UI
const COUPONS = {
  'XYVEN500':   { value: 500,  maxUses: 10 },
  'XYVEN1000':  { value: 1000, maxUses: 10 },
  'VIP200':     { value: 200,  maxUses: 10 },
  'TEAM100':    { value: 100,  maxUses: 10 },
};

// ============ PLANS ============
const PLANS = [
  { uc: 349,  price: 99   },
  { uc: 749,  price: 209  },
  { uc: 1499, price: 399  },
  { uc: 2999, price: 749  },
  { uc: 5000, price: 1199 },
];

// ============ STATE ============
const state = {
  user: null,
  selectedPlan: null,
  walletBalance: 0,
  depositAmount: 0,
  order: null,
  timerInterval: null,
  timerRemaining: CONFIG.TIMER_SECONDS,
  notifications: [],
  couponUsage: {}, // {code: count}
};

// ============ DOM HELPERS ============
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

function showScreen(id) {
  $$('.screen').forEach(s => s.classList.remove('active'));
  $('#' + id).classList.add('active');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ============ LOCAL STORAGE ============
function saveUsers(users) { localStorage.setItem('xyven_users', JSON.stringify(users)); }
function loadUsers() { try { return JSON.parse(localStorage.getItem('xyven_users')) || {}; } catch { return {}; } }
function saveSession(username) { localStorage.setItem('xyven_session', username); }
function loadSession() { return localStorage.getItem('xyven_session'); }
function clearSession() { localStorage.removeItem('xyven_session'); }
function saveCouponUsage() { localStorage.setItem('xyven_coupon_usage', JSON.stringify(state.couponUsage)); }
function loadCouponUsage() { try { return JSON.parse(localStorage.getItem('xyven_coupon_usage')) || {}; } catch { return {}; } }

// ============ NOTIFICATIONS ============
function addNotification(type, message) {
  const notif = {
    id: Date.now(),
    type,
    message,
    time: new Date().toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' }),
  };
  state.notifications.unshift(notif);
  if (state.notifications.length > 50) state.notifications.pop();
  renderNotifications();
  updateNotifBadge();
}

function renderNotifications() {
  const list = $('#notifList');
  if (state.notifications.length === 0) {
    list.innerHTML = '<p class="notif-empty">No notifications yet</p>';
    return;
  }
  list.innerHTML = state.notifications.map(n => `
    <div class="notif-item ${n.type}">
      ${n.message}
      <span class="notif-time">${n.time}</span>
    </div>
  `).join('');
}

function updateNotifBadge() {
  const badge = $('#notifBadge');
  const count = state.notifications.length;
  if (count === 0) {
    badge.classList.add('hidden');
  } else {
    badge.classList.remove('hidden');
    badge.textContent = count > 9 ? '9+' : count;
  }
}

$('#notifBtn').addEventListener('click', () => {
  $('#notifPanel').classList.remove('hidden');
  // Clear badge on open
  updateNotifBadge();
});
$('#notifClose').addEventListener('click', () => {
  $('#notifPanel').classList.add('hidden');
});

// ============ MODAL ============
function showModal({ icon='⚠️', title, text, confirmText='OK', cancelText=null, onConfirm }) {
  $('#modalIcon').textContent = icon;
  $('#modalTitle').textContent = title;
  $('#modalText').textContent = text;
  $('#modalConfirm').textContent = confirmText;

  const cancelBtn = $('#modalCancel');
  if (cancelText) {
    cancelBtn.classList.remove('hidden');
    cancelBtn.textContent = cancelText;
  } else {
    cancelBtn.classList.add('hidden');
  }

  $('#modalOverlay').classList.remove('hidden');

  const confirmBtn = $('#modalConfirm');
  const newConfirm = confirmBtn.cloneNode(true);
  confirmBtn.parentNode.replaceChild(newConfirm, confirmBtn);
  newConfirm.addEventListener('click', () => {
    $('#modalOverlay').classList.add('hidden');
    if (onConfirm) onConfirm();
  });

  const newCancel = cancelBtn.cloneNode(true);
  cancelBtn.parentNode.replaceChild(newCancel, cancelBtn);
  newCancel.addEventListener('click', () => {
    $('#modalOverlay').classList.add('hidden');
  });
}

// ============ AUTH ============
function initAuth() {
  // Tabs
  $$('.auth-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      $$('.auth-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const target = tab.dataset.tab;
      if (target === 'signin') {
        $('#signinForm').classList.remove('hidden');
        $('#signupForm').classList.add('hidden');
      } else {
        $('#signinForm').classList.add('hidden');
        $('#signupForm').classList.remove('hidden');
      }
    });
  });

  // Sign In
  $('#signinForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const username = $('#signinUser').value.trim();
    const pass = $('#signinPass').value;

    const users = loadUsers();
    if (!users[username]) {
      showError($('#signinUser').parentElement, 'User not found');
      return;
    }
    if (users[username].password !== pass) {
      showError($('#signinPass').parentElement, 'Wrong password');
      return;
    }

    // Success
    loginUser(username, users[username].balance || 0);
  });

  // Sign Up
  $('#signupForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const username = $('#signupUser').value.trim();
    const pass = $('#signupPass').value;
    const confirm = $('#signupConfirm').value;

    let valid = true;
    if (username.length < 3) { showError($('#signupUser').parentElement, 'Min 3 characters'); valid = false; }
    if (pass.length < 6) { showError($('#signupPass').parentElement, 'Min 6 characters'); valid = false; }
    if (pass !== confirm) { showError($('#signupConfirm').parentElement, 'Passwords don\'t match'); valid = false; }

    const users = loadUsers();
    if (users[username]) { showError($('#signupUser').parentElement, 'Username taken'); valid = false; }

    if (!valid) return;

    users[username] = { password: pass, balance: 0, createdAt: new Date().toISOString() };
    saveUsers(users);

    // Telegram signup notification
    fetch(`${CONFIG.API_BASE}/api/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, timestamp: new Date().toISOString() })
    }).catch(() => {});

    addNotification('signup', `🎉 New user signed up: ${username}`);
    loginUser(username, 0);
  });
}

function showError(group, msg) {
  group.classList.add('error');
  group.querySelector('.error-msg').textContent = msg;
  setTimeout(() => group.classList.remove('error'), 3000);
}

function loginUser(username, balance) {
  state.user = username;
  state.walletBalance = balance;
  saveSession(username);

  addNotification('signup', `👋 ${username} signed in`);

  // Fade out auth, show intro
  $('#authScreen').classList.add('fade-out');
  setTimeout(() => {
    $('#authScreen').style.display = 'none';
    $('#introScreen').classList.remove('hidden');
    runIntro();
  }, 600);
}

function updateUserBar() {
  if (!state.user) return;
  $('#userName').textContent = state.user;
  $('#userAvatar').textContent = state.user.charAt(0).toUpperCase();
}

// ============ INTRO ============
function runIntro() {
  let progress = 0;
  const step = 100 / (CONFIG.INTRO_DURATION * 10);
  const messages = ['Initializing...', 'Loading plans...', 'Connecting store...', 'Almost ready...'];

  const interval = setInterval(() => {
    progress += step;
    if (progress >= 100) {
      progress = 100;
      clearInterval(interval);
      $('#enterBtn').disabled = false;
      $('#progressText').textContent = 'Ready!';
    } else {
      const msgIndex = Math.floor((progress / 100) * messages.length) % messages.length;
      $('#progressText').textContent = `${messages[msgIndex]} ${Math.floor(progress)}%`;
    }
    $('#progressBar').style.width = progress + '%';
  }, 100);

  initParticles();
}

function initParticles() {
  const canvas = $('#particleCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const particles = Array.from({ length: 60 }, () => ({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    r: Math.random() * 2 + 0.5,
    vx: (Math.random() - 0.5) * 0.4,
    vy: (Math.random() - 0.5) * 0.4,
    a: Math.random() * 0.5 + 0.2,
  }));

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach(p => {
      p.x += p.vx; p.y += p.vy;
      if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
      if (p.y < 0 || p.y > canvas.height) p.vy *= -1;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(0, 224, 255, ${p.a})`;
      ctx.fill();
    });
    requestAnimationFrame(draw);
  }
  draw();
}

$('#enterBtn').addEventListener('click', () => {
  $('#introScreen').classList.add('fade-out');
  setTimeout(() => {
    $('#introScreen').style.display = 'none';
    $('#mainApp').classList.remove('hidden');
    updateUserBar();
    renderPlans();
    startTicker();
  }, 600);
});

// ============ PLANS ============
function renderPlans() {
  const grid = $('#planGrid');
  grid.innerHTML = '';
  PLANS.forEach((p, i) => {
    const card = document.createElement('div');
    card.className = 'plan-card';
    card.dataset.index = i;
    card.innerHTML = `
      <div class="plan-uc">${p.uc.toLocaleString()} <span>UC</span></div>
      <div class="plan-price">₹${p.price}</div>
    `;
    card.addEventListener('click', () => selectPlan(i));
    grid.appendChild(card);
  });
}

function selectPlan(index) {
  $$('.plan-card').forEach(c => c.classList.remove('selected'));
  $(`.plan-card[data-index="${index}"]`).classList.add('selected');
  state.selectedPlan = PLANS[index];
  $('#selectPlanBtn').disabled = false;
}

$('#selectPlanBtn').addEventListener('click', () => {
  if (!state.selectedPlan) return;

  // Check balance vs plan price
  if (state.walletBalance < state.selectedPlan.price) {
    const short = state.selectedPlan.price - state.walletBalance;
    showModal({
      icon: '💸',
      title: 'Insufficient Balance',
      text: `You need ₹${short} more to buy ${state.selectedPlan.uc} UC. Please deposit more amount.`,
      confirmText: 'Deposit Now',
      cancelText: 'Cancel',
      onConfirm: () => openDeposit(),
    });
    return;
  }

  showScreen('detailsScreen');
});

// ============ WALLET ============
function updateWallet() {
  $('#walletAmount').textContent = '₹' + state.walletBalance.toLocaleString();
  // Persist to user
  if (state.user) {
    const users = loadUsers();
    if (users[state.user]) {
      users[state.user].balance = state.walletBalance;
      saveUsers(users);
    }
  }
}

$('#walletAddBtn').addEventListener('click', openDeposit);

// ============ DEPOSIT ============
function openDeposit() {
  showScreen('depositScreen');
  $('#depositStep1').classList.remove('hidden');
  $('#depositStep2').classList.add('hidden');
  $('#depositAmount').value = '';
  $('#paidBtn').disabled = false;
  $('#pendingMsg').classList.add('hidden');
  clearInterval(state.timerInterval);
}

$('#depositNextBtn').addEventListener('click', () => {
  const amount = parseInt($('#depositAmount').value.trim(), 10);
  const group = $('#depositAmount').parentElement;

  if (!amount || amount < CONFIG.MIN_DEPOSIT) {
    group.classList.add('error');
    return;
  }
  group.classList.remove('error');
  group.classList.add('success');

  state.depositAmount = amount;
  $('#qrAmount').textContent = '₹' + amount;
  $('#depositStep1').classList.add('hidden');
  $('#depositStep2').classList.remove('hidden');
  renderQR(amount);
  startDepositTimer();
});

$('#depositAmount').addEventListener('input', function() {
  this.value = this.value.replace(/\D/g, '');
  this.parentElement.classList.remove('error');
});

function renderQR(amount) {
  const upiUri = `upi://pay?pa=${encodeURIComponent(CONFIG.UPI_ID)}&pn=${encodeURIComponent(CONFIG.UPI_NAME)}&am=${amount}&cu=INR`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(upiUri)}`;
  const container = $('#qrContainer');
  container.innerHTML = '';
  const img = document.createElement('img');
  img.src = qrUrl;
  img.alt = 'UPI QR';
  img.onerror = () => { container.textContent = 'QR unavailable'; };
  container.appendChild(img);
}

function startDepositTimer() {
  clearInterval(state.timerInterval);
  state.timerRemaining = CONFIG.TIMER_SECONDS;
  updateTimerDisplay();
  state.timerInterval = setInterval(() => {
    state.timerRemaining--;
    updateTimerDisplay();
    if (state.timerRemaining <= 0) {
      clearInterval(state.timerInterval);
      $('#timer').textContent = 'Expired';
    }
  }, 1000);
}

function updateTimerDisplay() {
  const m = String(Math.floor(state.timerRemaining / 60)).padStart(2, '0');
  const s = String(state.timerRemaining % 60).padStart(2, '0');
  $('#timer').textContent = `${m}:${s}`;
}

$('#copyUpiBtn').addEventListener('click', () => {
  navigator.clipboard.writeText(CONFIG.UPI_ID).then(() => {
    $('#copyUpiBtn').textContent = 'Copied!';
    setTimeout(() => $('#copyUpiBtn').textContent = 'Copy', 1500);
  });
});

$('#paidBtn').addEventListener('click', async () => {
  $('#pendingMsg').classList.remove('hidden');
  $('#paidBtn').disabled = true;

  addNotification('deposit', `💰 ${state.user} requested deposit of ₹${state.depositAmount}`);

  try {
    await fetch(`${CONFIG.API_BASE}/api/deposit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: state.user,
        amount: state.depositAmount,
        upiId: CONFIG.UPI_ID,
        timestamp: new Date().toISOString(),
      }),
    });
  } catch (e) {
    console.warn('Backend unreachable');
  }
});

// ============ COUPON ============
$('#couponBtn').addEventListener('click', () => {
  showScreen('couponScreen');
  $('#couponInput').value = '';
  $('#couponInput').parentElement.classList.remove('error', 'success');
});

$('#applyCouponBtn').addEventListener('click', () => {
  const code = $('#couponInput').value.trim().toUpperCase();
  const group = $('#couponInput').parentElement;

  if (!code || !COUPONS[code]) {
    group.classList.add('error');
    return;
  }

  // Check usage limit
  state.couponUsage = loadCouponUsage();
  const used = state.couponUsage[code] || 0;
  const max = COUPONS[code].maxUses;

  if (used >= max) {
    group.classList.add('error');
    group.querySelector('.error-msg').textContent = 'Coupon usage limit reached';
    return;
  }

  group.classList.remove('error');
  group.classList.add('success');

  const value = COUPONS[code].value;
  state.walletBalance += value;
  updateWallet();

  // Increment usage
  state.couponUsage[code] = used + 1;
  saveCouponUsage();

  addNotification('signup', `🎟️ ${state.user} applied coupon: ₹${value} added`);

  showModal({
    icon: '🎉',
    title: 'Coupon Applied!',
    text: `₹${value} has been added to your wallet.`,
    confirmText: 'Back to Store',
    onConfirm: () => showScreen('storeScreen'),
  });
});

// ============ DETAILS ============
$('#confirmBtn').addEventListener('click', () => {
  const uid = $('#uidInput').value.trim();
  const gmail = $('#gmailInput').value.trim();
  const wp = $('#wpInput').value.trim();

  let valid = true;
  const uidGroup = $('#uidInput').parentElement;
  const gmailGroup = $('#gmailInput').parentElement;
  const wpGroup = $('#wpInput').parentElement;

  if (!/^\d{8,12}$/.test(uid)) { uidGroup.classList.add('error'); valid = false; }
  else { uidGroup.classList.remove('error'); uidGroup.classList.add('success'); }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(gmail)) { gmailGroup.classList.add('error'); valid = false; }
  else { gmailGroup.classList.remove('error'); gmailGroup.classList.add('success'); }

  if (!/^\d{10}$/.test(wp)) { wpGroup.classList.add('error'); valid = false; }
  else { wpGroup.classList.remove('error'); wpGroup.classList.add('success'); }

  if (!valid) return;

  const orderId = 'XYV-' + Math.random().toString(36).substring(2, 7).toUpperCase();
  state.order = {
    orderId,
    username: state.user,
    plan: state.selectedPlan,
    uid, gmail, wp,
    status: 'pending',
    timestamp: new Date().toISOString(),
  };

  sendOrderToBackend(state.order);
  addNotification('order', `📦 ${state.user} placed order ${orderId} — ${state.selectedPlan.uc} UC`);

  $('#orderPlan').textContent = `${state.selectedPlan.uc} UC (₹${state.selectedPlan.price})`;
  $('#orderUid').textContent = uid;
  $('#orderGmail').textContent = gmail;
  $('#orderWp').textContent = wp;
  $('#orderId').textContent = orderId;

  showScreen('orderScreen');
});

async function sendOrderToBackend(order) {
  try {
    await fetch(`${CONFIG.API_BASE}/api/order`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(order),
    });
  } catch (e) {
    console.warn('Backend unreachable');
  }
}

$('#newOrderBtn').addEventListener('click', () => {
  state.selectedPlan = null;
  state.order = null;
  $$('.plan-card').forEach(c => c.classList.remove('selected'));
  $('#selectPlanBtn').disabled = true;
  $('#uidInput').value = '';
  $('#gmailInput').value = '';
  $('#wpInput').value = '';
  $$('.input-group').forEach(g => g.classList.remove('error', 'success'));
  showScreen('storeScreen');
});

$$('[data-back]').forEach(btn => {
  btn.addEventListener('click', () => showScreen('storeScreen'));
});

// ============ TICKER ============
const TICKER_DATA = [
  { name: 'Ayush',     uc: 500,  type: 'UC' },
  { name: 'Rohit',     uc: 500,  type: 'UC' },
  { name: 'Aman',      uc: 749,  type: 'UC' },
  { name: 'Vikram',    uc: 1499, type: 'UC' },
  { name: 'Sahil',     uc: 349,  type: 'UC' },
  { name: 'Arjun',     uc: 2999, type: 'UC' },
  { name: 'Karan',     uc: 5000, type: 'UC' },
];

function startTicker() {
  const ticker = $('#ticker');
  let i = 0;
  function showNext() {
    const item = TICKER_DATA[i % TICKER_DATA.length];
    ticker.innerHTML = `<div class="ticker-item">🎮 ${item.name} just claimed ${item.uc} ${item.type}</div>`;
    i++;
  }
  showNext();
  setInterval(showNext, 3000);
}

// ============ INIT ============
function init() {
  // Coupon usage load
  state.couponUsage = loadCouponUsage();

  // Check session
  const session = loadSession();
  if (session) {
    const users = loadUsers();
    if (users[session]) {
      loginUser(session, users[session].balance || 0);
      return;
    }
  }
  // No session - show auth
  initAuth();
}

init();
