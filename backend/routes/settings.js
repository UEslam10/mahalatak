const express = require('express');
const db = require('../db/database');

const router = express.Router();

function getSetting(key, fallback = '') {
  const row = db.prepare('SELECT value FROM platform_settings WHERE key = ?').get(key);
  return row ? row.value : fallback;
}

// إعدادات عامة يحتاجها أي زائر (مش لازم يكون مسجل دخول) - زي أرقام الدفع الإلكتروني
router.get('/public', (req, res) => {
  res.json({
    vodafoneCashNumber: getSetting('vodafone_cash_number'),
    instapayHandle: getSetting('instapay_handle'),
    supportPhone: getSetting('support_phone'),
    supportEmail: getSetting('support_email'),
  });
});

module.exports = router;
