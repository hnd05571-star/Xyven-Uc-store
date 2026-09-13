/* =========================================================
   XYVEN UC STORE - Main Script
   ========================================================= */

// ============ CONFIG ============
const CONFIG = {
  // ⚠️ BACKEND ENDPOINT - Replace with your deployed server URL
  // Example: 'https://your-backend.onrender.com'
  API_BASE: '',
  
  // ⚠️ TELEGRAM BOT - token & chat ID are set in BACKEND .env ONLY.
  // Frontend sends data to API_BASE/api/order, backend forwards to Telegram.
  
  // Intro duration (seconds)
  INTRO_DURATION: 15,
  
  // UPI details
  UPI_ID: 'harshsinghs@fam',
  UPI_NAME: 'XYVEN UC Store',
  MIN_DEPOSIT: 200,
  
  // Deposit timer (2:30)
  TIMER_SECONDS: 150,
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
  order: null,
  timerInterval: null,
  timerRemaining: CONFIG.TIMER_SECONDS,
};

// ============ DOM HELPERS ============
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

function showScreen(id) {
  $$('.screen').forEach(s => s.classList.remove('active'));
  $('#' + id).classList.add('active');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ============ INTRO ANIMATION ============
function runIntro() {
  let progress = 0;
  const step = 100 / (CONFIG.INTRO_DURATION * 10); // 100ms updates

  const interval = setInterval(() => {
    progress += step;
    if (progress >= 100) {
      progress = 100;
      clearInterval(interval);
      $('#enterBtn').disabled = false;
      $('#progressText').textContent = 'Ready!';
    } else {
      $('#progressText').textContent = `Loading... ${Math.floor(progress)}%`;
    }
    $('#progressBar').style.width = progress + '%';
  }, 100);

  // Particle background
  initParticles();
}

function initParticles() {
  const canvas = $('#particleCanvas');
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
      p.x += p.vx;
      p.y += p.vy;
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
  if (state.walletBalance < CONFIG.MIN_DEPOSIT) {
    alert(`Minimum deposit ₹${CONFIG.MIN_DEPOSIT} required. Please deposit first.`);
    openDeposit();
    return;
  }
  showScreen('detailsScreen');
});

// ============ WALLET / DEPOSIT ============
function openDeposit() {
  showScreen('depositScreen');
  renderQR();
  startDepositTimer();
}

$('#walletAddBtn').addEventListener('click', openDeposit);

function renderQR() {
  const upiUri = `upi://pay?pa=${encodeURIComponent(CONFIG.UPI_ID)}&pn=${encodeURIComponent(CONFIG.UPI_NAME)}&am=${CONFIG.MIN_DEPOSIT}&cu=INR`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(upiUri)}`;
  const container = $('#qrContainer');
  container.innerHTML = '';
  const img = document.createElement('img');
  img.src = qrUrl;
  img.alt = 'UPI QR';
  img.style.width = '100%';
  img.style.height = '100%';
  img.style.borderRadius = '10px';
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

$('#paidBtn').addEventListener('click', () => {
  // ⚠️ BACKEND INTEGRATION POINT:
  // POST /api/deposit with { amount, upiId, timestamp }
  // Backend verifies and updates wallet.
  // For now, we show pending state (no fake approval).
  $('#pendingMsg').classList.remove('hidden');
  $('#paidBtn').disabled = true;
  // Mock wallet credit after "verification" (in production, backend confirms)
  // This simulates what backend would do after manual verification:
  // state.walletBalance += CONFIG.MIN_DEPOSIT; updateWallet();
  // But we DON'T auto-credit - we wait for admin.
  setTimeout(() => {
    alert('Payment verification pending. Admin will confirm shortly.');
  }, 800);
});

function updateWallet() {
  $('#walletAmount').textContent = '₹' + state.walletBalance.toLocaleString();
}

// ============ USER DETAILS ============
$('#confirmBtn').addEventListener('click', () => {
  const uid = $('#uidInput').value.trim();
  const gmail = $('#gmailInput').value.trim();
  const wp = $('#wpInput').value.trim();

  let valid = true;

  // UID: 8-12 digits
  const uidGroup = $('#uidInput').parentElement;
  if (!/^\d{8,12}$/.test(uid)) {
    uidGroup.classList.add('error');
    uidGroup.classList.remove('success');
    valid = false;
  } else {
    uidGroup.classList.remove('error');
    uidGroup.classList.add('success');
  }

  // Gmail
  const gmailGroup = $('#gmailInput').parentElement;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(gmail)) {
    gmailGroup.classList.add('error');
    gmailGroup.classList.remove('success');
    valid = false;
  } else {
    gmailGroup.classList.remove('error');
    gmailGroup.classList.add('success');
  }

  // WhatsApp: 10 digits
  const wpGroup = $('#wpInput').parentElement;
  if (!/^\d{10}$/.test(wp)) {
    wpGroup.classList.add('error');
    wpGroup.classList.remove('success');
    valid = false;
  } else {
    wpGroup.classList.remove('error');
    wpGroup.classList.add('success');
  }

  if (!valid) return;

  // Create order
  const orderId = 'XYV-' + Math.random().toString(36).substring(2, 7).toUpperCase();
  state.order = {
    orderId,
    plan: state.selectedPlan,
    uid,
    gmail,
    wp,
    status: 'pending',
    timestamp: new Date().toISOString(),
  };

  // Send to backend (Telegram integration)
  sendOrderToBackend(state.order);

  // Render order card
  $('#orderPlan').textContent = `${state.selectedPlan.uc} UC (₹${state.selectedPlan.price})`;
  $('#orderUid').textContent = uid;
  $('#orderGmail').textContent = gmail;
  $('#orderWp').textContent = wp;
  $('#orderId').textContent = orderId;

  showScreen('orderScreen');
});

// ============ BACKEND INTEGRATION ============
async function sendOrderToBackend(order) {
  try {
    const res = await fetch(`${CONFIG.API_BASE}/api/order`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(order),
    });
    const data = await res.json();
    if (data.success) {
      console.log('Order sent to backend:', data.orderId);
    } else {
      console.warn('Backend error:', data.message);
    }
  } catch (e) {
    console.warn('Backend not reachable (prototype mode):', e.message);
    // ⚠️ In production, retry or queue the order.
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

// ============ RECENT ACTIVITY TICKER ============
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
