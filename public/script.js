/* =========================================================
   XYVEN UC STORE - Main Script
   ========================================================= */

const CONFIG = {
  API_BASE: '',                     // Backend URL (empty = same server)
  INTRO_DURATION: 15,               // seconds
  UPI_ID: 'harshsinghs@fam',
  UPI_NAME: 'XYVEN UC Store',
  MIN_DEPOSIT: 200,
  TIMER_SECONDS: 150,               // 2:30
};

// ============ COUPONS (add more here) ============
const COUPONS = {
  'XYVEN500': 500,
  // 'XYVEN100': 100,
  // 'WELCOME50': 50,
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
  selectedPlan: null,
  walletBalance: 0,
  depositAmount: 0,
  order: null,
  timerInterval: null,
  timerRemaining: CONFIG.TIMER_SECONDS,
  couponApplied: false,
};

// ============ DOM HELPERS ============
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

function showScreen(id) {
  $$('.screen').forEach(s => s.classList.remove('active'));
  $('#' + id).classList.add('active');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ============ MODAL ============
function showModal({ icon='⚠️', title, text, confirmText='Deposit Now', onConfirm, cancelText='Cancel' }) {
  $('#modalIcon').textContent = icon;
  $('#modalTitle').textContent = title;
  $('#modalText').textContent = text;
  $('#modalConfirm').textContent = confirmText;
  $('#modalCancel').textContent = cancelText;
  $('#modalOverlay').classList.remove('hidden');

  const confirmBtn = $('#modalConfirm');
  const cancelBtn = $('#modalCancel');

  // Remove old listeners
  const newConfirm = confirmBtn.cloneNode(true);
  const newCancel = cancelBtn.cloneNode(true);
  confirmBtn.parentNode.replaceChild(newConfirm, confirmBtn);
  cancelBtn.parentNode.replaceChild(newCancel, cancelBtn);

  newConfirm.addEventListener('click', () => {
    $('#modalOverlay').classList.add('hidden');
    if (onConfirm) onConfirm();
  });
  newCancel.addEventListener('click', () => {
    $('#modalOverlay').classList.add('hidden');
  });
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
  const ctx = canvas.getContext('2d');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const particles = Array.from({ length: 70 }, () => ({
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

  window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  });
}

// ============ ENTER STORE ============
$('#enterBtn').addEventListener('click', () => {
  $('#introScreen').classList.add('fade-out');
  setTimeout(() => {
    $('#introScreen').style.display = 'none';
    $('#mainApp').classList.remove('hidden');
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

  // Check wallet balance
  if (state.walletBalance < CONFIG.MIN_DEPOSIT) {
    showModal({
      icon: '💸',
      title: 'Insufficient Balance',
      text: `Please deposit minimum ₹${CONFIG.MIN_DEPOSIT} first to continue with your order.`,
      confirmText: 'Deposit Now',
      onConfirm: () => openDeposit(),
    });
    return;
  }

  showScreen('detailsScreen');
});

// ============ WALLET ============
function updateWallet() {
  $('#walletAmount').textContent = '₹' + state.walletBalance.toLocaleString();
}

$('#walletAddBtn').addEventListener('click', openDeposit);

// ============ DEPOSIT FLOW ============
function openDeposit() {
  showScreen('depositScreen');
  // Reset to step 1
  $('#depositStep1').classList.remove('hidden');
  $('#depositStep2').classList.add('hidden');
  $('#depositAmount').value = '';
  $('#paidBtn').disabled = false;
  $('#pendingMsg').classList.add('hidden');
  clearInterval(state.timerInterval);
}

$('#depositNextBtn').addEventListener('click', () => {
  const amount = parseInt($('#depositAmount').value.trim(), 10);
  const inputGroup = $('#depositAmount').parentElement;

  if (!amount || amount < CONFIG.MIN_DEPOSIT) {
    inputGroup.classList.add('error');
    return;
  }
  inputGroup.classList.remove('error');
  inputGroup.classList.add('success');

  state.depositAmount = amount;
  $('#qrAmount').textContent = '₹' + amount;

  // Move to step 2
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

  // ⚠️ BACKEND: notify admin via /api/deposit
  try {
    await fetch(`${CONFIG.API_BASE}/api/deposit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount: state.depositAmount,
        upiId: CONFIG.UPI_ID,
        timestamp: new Date().toISOString(),
      }),
    });
  } catch (e) {
    console.warn('Backend unreachable (prototype mode)');
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
  const inputGroup = $('#couponInput').parentElement;

  if (!code || !COUPONS[code]) {
    inputGroup.classList.add('error');
    return;
  }

  inputGroup.classList.remove('error');
  inputGroup.classList.add('success');

  const value = COUPONS[code];
  state.walletBalance += value;
  updateWallet();
  state.couponApplied = true;

  showModal({
    icon: '🎉',
    title: 'Coupon Applied!',
    text: `₹${value} has been added to your wallet.`,
    confirmText: 'Back to Store',
    cancelText: 'Close',
    onConfirm: () => showScreen('storeScreen'),
  });
});

// ============ USER DETAILS ============
$('#confirmBtn').addEventListener('click', () => {
  const uid = $('#uidInput').value.trim();
  const gmail = $('#gmailInput').value.trim();
  const wp = $('#wpInput').value.trim();

  let valid = true;

  const uidGroup = $('#uidInput').parentElement;
  if (!/^\d{8,12}$/.test(uid)) {
    uidGroup.classList.add('error'); uidGroup.classList.remove('success'); valid = false;
  } else { uidGroup.classList.remove('error'); uidGroup.classList.add('success'); }

  const gmailGroup = $('#gmailInput').parentElement;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(gmail)) {
    gmailGroup.classList.add('error'); gmailGroup.classList.remove('success'); valid = false;
  } else { gmailGroup.classList.remove('error'); gmailGroup.classList.add('success'); }

  const wpGroup = $('#wpInput').parentElement;
  if (!/^\d{10}$/.test(wp)) {
    wpGroup.classList.add('error'); wpGroup.classList.remove('success'); valid = false;
  } else { wpGroup.classList.remove('error'); wpGroup.classList.add('success'); }

  if (!valid) return;

  const orderId = 'XYV-' + Math.random().toString(36).substring(2, 7).toUpperCase();
  state.order = {
    orderId,
    plan: state.selectedPlan,
    uid, gmail, wp,
    status: 'pending',
    timestamp: new Date().toISOString(),
  };

  sendOrderToBackend(state.order);

  $('#orderPlan').textContent = `${state.selectedPlan.uc} UC (₹${state.selectedPlan.price})`;
  $('#orderUid').textContent = uid;
  $('#orderGmail').textContent = gmail;
  $('#orderWp').textContent = wp;
  $('#orderId').textContent = orderId;

  showScreen('orderScreen');
});

// ============ BACKEND ============
async function sendOrderToBackend(order) {
  try {
    const res = await fetch(`${CONFIG.API_BASE}/api/order`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(order),
    });
    const data = await res.json();
    if (data.success) console.log('Order sent:', data.orderId);
  } catch (e) {
    console.warn('Backend not reachable (prototype mode):', e.message);
  }
}

// ============ NEW ORDER ============
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

// ============ BACK BUTTONS ============
$$('[data-back]').forEach(btn => {
  btn.addEventListener('click', () => showScreen('storeScreen'));
});

// ============ TICKER ============
const TICKER_DATA = [
  { name: 'Ayush', uc: 500, type: 'Sample Order' },
  { name: 'Rohit Jhankar', uc: 500, type: 'Sample Order' },
  { name: 'Aman', uc: 749, type: 'Sample Order' },
  { name: 'Vikram', uc: 1499, type: 'Sample Order' },
  { name: 'Sahil', uc: 349, type: 'Sample Order' },
];

function startTicker() {
  const ticker = $('#ticker');
  let i = 0;
  function showNext() {
    const item = TICKER_DATA[i % TICKER_DATA.length];
    ticker.innerHTML = `<div class="ticker-item">${item.name} — ${item.uc} UC — ${item.type}</div>`;
    i++;
  }
  showNext();
  setInterval(showNext, 3000);
}

// ============ INIT ============
runIntro();
