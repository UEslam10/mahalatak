const express = require('express');
const db = require('../db/database');

const router = express.Router();

// قائمة المدن والقرى المتاحة على المنصة (يديرها الأدمن)
router.get('/', (req, res) => {
  const rows = db.prepare('SELECT * FROM locations ORDER BY city, village').all();

  const map = {};
  rows.forEach((r) => {
    if (!map[r.city]) map[r.city] = new Set();
    if (r.village) map[r.city].add(r.village);
  });

  const result = Object.entries(map).map(([city, villages]) => ({
    city,
    villages: [...villages],
  }));

  res.json({ locations: result });
});

module.exports = router;
