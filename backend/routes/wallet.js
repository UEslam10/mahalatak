const express = require('express');
const db = require('../db/database');
const { authRequired, requireRole } = require('../middleware/auth');
const { getCommissionRate, getCourierCommissionRate } = require('../utils/wallet');

const router = express.Router();

// نسب العمولة الحالية (لعرض الأرباح المتوقعة قبل التسليم للتاجر/المندوب)
router.get('/rates', authRequired, (req, res) => {
  res.json({ commissionRate: getCommissionRate(), courierCommissionRate: getCourierCommissionRate() });
});

// محفظتي (تاجر أو مندوب): الرصيد الحالي + آخر الحركات
router.get('/me', authRequired, requireRole('vendor', 'delivery', 'admin'), (req, res) => {
  const user = db.prepare('SELECT wallet_balance FROM users WHERE id = ?').get(req.user.id);
  const transactions = db.prepare(`
    SELECT * FROM wallet_transactions WHERE user_id = ? ORDER BY created_at DESC LIMIT 100
  `).all(req.user.id);
  res.json({ balance: user?.wallet_balance || 0, transactions });
});

module.exports = router;
