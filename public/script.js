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
