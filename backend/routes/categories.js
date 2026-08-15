const express = require('express');
const db = require('../db/database');

const router = express.Router();

// كل الفئات + عدد المحلات في كل فئة (اختياري حسب المدينة)
router.get('/', (req, res) => {
  const { city } = req.query;

  let categories;
  if (city) {
    categories = db.prepare(`
      SELECT c.*, COUNT(s.id) as stores_count
      FROM categories c
      LEFT JOIN stores s ON s.category_id = c.id AND s.city = ?
      GROUP BY c.id
      ORDER BY c.sort_order ASC
    `).all(city);
  } else {
    categories = db.prepare(`
      SELECT c.*, COUNT(s.id) as stores_count
      FROM categories c
      LEFT JOIN stores s ON s.category_id = c.id
      GROUP BY c.id
      ORDER BY c.sort_order ASC
    `).all();
  }

  res.json({ categories });
});

module.exports = router;
