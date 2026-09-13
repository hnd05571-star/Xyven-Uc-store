require('dotenv').config();
const express = require('express');
const cors = require('cors');
const TelegramBot = require('node-telegram-bot-api');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(express.static('public')); // serve index.html, style.css, script.js

// Telegram Bot (token from .env, NEVER in frontend)
const botToken = process.env.TELEGRAM_BOT_TOKEN;
const chatId = process.env.TELEGRAM_CHAT_ID;
let bot = null;
if (botToken) bot = new TelegramBot(botToken, { polling: false });

// ============ ORDER ENDPOINT ============
app.post('/api/order', async (req, res) => {
  const order = req.body;

  // Validate
  if (!order.orderId || !order.uid || !order.gmail || !order.wp || !order.plan) {
    return res.status(400).json({ success: false, message: 'Missing fields' });
  }

  // Format Telegram message
  const msg =
    `🎮 REQUEST UC\n\n` +
    `Plan: ${order.plan.uc} UC (₹${order.plan.price})\n` +
    `UID: ${order.uid}\n` +
    `Gmail: ${order.gmail}\n` +
    `WP Number: ${order.wp}\n` +
    `Order ID: ${order.orderId}\n` +
    `Payment: Pending`;

  // Send to Telegram
  if (bot && chatId) {
    try {
      await bot.sendMessage(chatId, msg);
      console.log('Telegram sent for order:', order.orderId);
    } catch (e) {
      console.error('Telegram error:', e.message);
    }
  }

  res.json({ success: true, orderId: order.orderId });
});

// ============ DEPOSIT ENDPOINT ============
app.post('/api/deposit', async (req, res) => {
  const { amount, upiId, timestamp } = req.body;
  if (!amount || amount < 200) {
    return res.status(400).json({ success: false, message: 'Minimum ₹200' });
  }

  const msg =
    `💰 DEPOSIT REQUEST\n\n` +
    `Amount: ₹${amount}\n` +
    `UPI: ${upiId}\n` +
    `Time: ${timestamp}\n` +
    `Status: Pending Verification`;

  if (bot && chatId) {
    try { await bot.sendMessage(chatId, msg); } catch (e) { console.error(e.message); }
  }

  res.json({ success: true, message: 'Verification pending' });
});

// ============ ADMIN: APPROVE ============
// Protected by simple token from .env
app.post('/api/admin/approve', async (req, res) => {
  const token = req.headers.authorization;
  if (token !== `Bearer ${process.env.ADMIN_TOKEN}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const { orderId, status } = req.body;
  // In production: update DB, notify user.
  res.json({ success: true, orderId, status });
});

// ============ SERVE FRONTEND ============
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => console.log(`Server running on ${PORT}`));
