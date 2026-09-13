require('dotenv').config();
const express = require('express');
const cors = require('cors');
const TelegramBot = require('node-telegram-bot-api');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(express.static('public'));

const botToken = process.env.TELEGRAM_BOT_TOKEN;
const chatId = process.env.TELEGRAM_CHAT_ID;
let bot = null;
if (botToken) bot = new TelegramBot(botToken, { polling: false });

// SIGNUP
app.post('/api/signup', async (req, res) => {
  const { username, timestamp } = req.body;
  if (!username) return res.status(400).json({ success: false });
  const msg =
    `🆕 NEW SIGNUP\n\n` +
    `Username: ${username}\n` +
    `Time: ${new Date(timestamp).toLocaleString()}`;
  if (bot && chatId) {
    try { await bot.sendMessage(chatId, msg); } catch (e) { console.error(e.message); }
  }
  res.json({ success: true });
});

// ORDER
app.post('/api/order', async (req, res) => {
  const o = req.body;
  if (!o.orderId || !o.uid || !o.gmail || !o.wp || !o.plan) {
    return res.status(400).json({ success: false, message: 'Missing fields' });
  }
  const msg =
    `🎮 REQUEST UC\n\n` +
    `User: ${o.username || 'Guest'}\n` +
    `Plan: ${o.plan.uc} UC (₹${o.plan.price})\n` +
    `UID: ${o.uid}\n` +
    `Gmail: ${o.gmail}\n` +
    `WP Number: ${o.wp}\n` +
    `Order ID: ${o.orderId}\n` +
    `Payment: Pending`;
  if (bot && chatId) {
    try { await bot.sendMessage(chatId, msg); } catch (e) { console.error(e.message); }
  }
  res.json({ success: true, orderId: o.orderId });
});

// DEPOSIT
app.post('/api/deposit', async (req, res) => {
  const { username, amount, upiId, timestamp } = req.body;
  if (!amount || amount < 200) {
    return res.status(400).json({ success: false, message: 'Minimum ₹200' });
  }
  const msg =
    `💰 DEPOSIT REQUEST\n\n` +
    `User: ${username || 'Guest'}\n` +
    `Amount: ₹${amount}\n` +
    `UPI: ${upiId}\n` +
    `Time: ${new Date(timestamp).toLocaleString()}\n` +
    `Status: Pending Verification`;
  if (bot && chatId) {
    try { await bot.sendMessage(chatId, msg); } catch (e) { console.error(e.message); }
  }
  res.json({ success: true, message: 'Verification pending' });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => console.log(`Server running on ${PORT}`));
