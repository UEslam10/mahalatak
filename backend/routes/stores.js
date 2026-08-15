const express = require('express');
const db = require('../db/database');
const { authRequired, requireRole } = require('../middleware/auth');

const router = express.Router();

// قائمة المحلات مع فلاتر: فئة، مدينة، قرية، بحث بالاسم
router.get('/', (req, res) => {
  const { category_id, city, village, q } = req.query;

  let sql = `
    SELECT s.*, c.name as category_name, c.icon as category_icon
    FROM stores s
    JOIN categories c ON c.id = s.category_id
    WHERE 1=1
  `;
  const params = [];

  if (category_id) {
    sql += ' AND s.category_id = ?';
    params.push(category_id);
  }
  if (city) {
    sql += ' AND s.city = ?';
    params.push(city);
  }
  if (village) {
    sql += ' AND s.village = ?';
    params.push(village);
  }
  if (q) {
    sql += ' AND (s.name LIKE ? OR EXISTS (SELECT 1 FROM products p WHERE p.store_id = s.id AND p.name LIKE ?))';
    params.push(`%${q}%`, `%${q}%`);
  }

  sql += ' ORDER BY s.is_open DESC, s.rating DESC';

  const stores = db.prepare(sql).all(...params);
  res.json({ stores });
});

// بحث عن منتجات مباشرة (يستخدم في صفحة البحث لعرض "منتجات" جنب "محلات")
router.get('/products-search', (req, res) => {
  const { q, city } = req.query;
  if (!q || !q.trim()) return res.json({ products: [] });

  let sql = `
    SELECT p.*, s.id as store_id, s.name as store_name, s.image as store_image, s.city, s.village, s.is_open
    FROM products p JOIN stores s ON s.id = p.store_id
    WHERE p.is_available = 1 AND p.name LIKE ?
  `;
  const params = [`%${q.trim()}%`];
  if (city) {
    sql += ' AND s.city = ?';
    params.push(city);
  }
  sql += ' ORDER BY s.is_open DESC, p.name ASC LIMIT 30';

  const products = db.prepare(sql).all(...params);
  res.json({ products });
});

// تفاصيل محل واحد
router.get('/:id', (req, res) => {
  const store = db.prepare(`
    SELECT s.*, c.name as category_name, c.icon as category_icon
    FROM stores s JOIN categories c ON c.id = s.category_id
    WHERE s.id = ?
  `).get(req.params.id);

  if (!store) return res.status(404).json({ error: 'المحل غير موجود' });
  res.json({ store });
});

// منتجات محل معين
router.get('/:id/products', (req, res) => {
  const products = db.prepare(`
    SELECT * FROM products WHERE store_id = ? ORDER BY is_available DESC, id ASC
  `).all(req.params.id);
  res.json({ products });
});

// تقييمات محل معين (عامة، يشوفها أي حد)
router.get('/:id/reviews', (req, res) => {
  const reviews = db.prepare(`
    SELECT r.*, u.name as customer_name
    FROM reviews r JOIN users u ON u.id = r.user_id
    WHERE r.store_id = ?
    ORDER BY r.created_at DESC
    LIMIT 50
  `).all(req.params.id);
  res.json({ reviews });
});

// إنشاء محل جديد (للتاجر، أو الأدمن ويقدر يحدد صاحب المحل)
router.post('/', authRequired, requireRole('vendor', 'admin'), (req, res) => {
  const { category_id, name, description, image, city, village, address, phone, delivery_fee, min_order, owner_id } = req.body;

  if (!category_id || !name || !city || !address || !phone) {
    return res.status(400).json({ error: 'الفئة والاسم والمدينة والعنوان والموبايل مطلوبين' });
  }

  // الأدمن يقدر يحدد صاحب محل معين أو يسيبه بدون صاحب، التاجر بيبقى صاحب محله دايمًا
  const finalOwnerId = req.user.role === 'admin' ? (owner_id || null) : req.user.id;

  const info = db.prepare(`
    INSERT INTO stores (owner_id, category_id, name, description, image, city, village, address, phone, delivery_fee, min_order, rating, rating_count)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0)
  `).run(
    finalOwnerId, category_id, name, description || '', image || '🏪',
    city, village || null, address, phone, delivery_fee || 0, min_order || 0
  );

  const store = db.prepare('SELECT * FROM stores WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json({ store });
});

// محلات التاجر الحالي
router.get('/mine/list', authRequired, requireRole('vendor', 'admin'), (req, res) => {
  const stores = db.prepare('SELECT * FROM stores WHERE owner_id = ?').all(req.user.id);
  res.json({ stores });
});

// تعديل محل (صاحب المحل فقط)
router.patch('/:id', authRequired, requireRole('vendor', 'admin'), (req, res) => {
  const store = db.prepare('SELECT * FROM stores WHERE id = ?').get(req.params.id);
  if (!store) return res.status(404).json({ error: 'المحل غير موجود' });
  if (store.owner_id !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'لا تملك صلاحية تعديل هذا المحل' });
  }

  const fields = ['name', 'description', 'image', 'city', 'village', 'address', 'phone', 'is_open', 'delivery_fee', 'min_order'];
  const updates = [];
  const params = [];
  fields.forEach(f => {
    if (req.body[f] !== undefined) {
      updates.push(`${f} = ?`);
      params.push(req.body[f]);
    }
  });
  if (updates.length === 0) return res.status(400).json({ error: 'لا توجد بيانات للتعديل' });

  params.push(req.params.id);
  db.prepare(`UPDATE stores SET ${updates.join(', ')} WHERE id = ?`).run(...params);

  const updated = db.prepare('SELECT * FROM stores WHERE id = ?').get(req.params.id);
  res.json({ store: updated });
});

// حذف محل (صاحب المحل أو الأدمن)
router.delete('/:id', authRequired, requireRole('vendor', 'admin'), (req, res) => {
  const store = db.prepare('SELECT * FROM stores WHERE id = ?').get(req.params.id);
  if (!store) return res.status(404).json({ error: 'المحل غير موجود' });
  if (store.owner_id !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'لا تملك صلاحية حذف هذا المحل' });
  }

  try {
    db.prepare('DELETE FROM stores WHERE id = ?').run(req.params.id);
  } catch (err) {
    return res.status(400).json({ error: 'مينفعش تحذف محل ليه طلبات سابقة، اقفله بدل الحذف' });
  }
  res.json({ success: true });
});

// إضافة منتج لمحل (صاحب المحل فقط)
router.post('/:id/products', authRequired, requireRole('vendor', 'admin'), (req, res) => {
  const store = db.prepare('SELECT * FROM stores WHERE id = ?').get(req.params.id);
  if (!store) return res.status(404).json({ error: 'المحل غير موجود' });
  if (store.owner_id !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'لا تملك صلاحية الإضافة لهذا المحل' });
  }

  const { name, description, price, image } = req.body;
  if (!name || price === undefined) {
    return res.status(400).json({ error: 'اسم المنتج والسعر مطلوبين' });
  }

  const info = db.prepare(`
    INSERT INTO products (store_id, name, description, price, image)
    VALUES (?, ?, ?, ?, ?)
  `).run(req.params.id, name, description || '', price, image || '🛍️');

  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json({ product });
});

// تعديل منتج
router.patch('/products/:productId', authRequired, requireRole('vendor', 'admin'), (req, res) => {
  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.productId);
  if (!product) return res.status(404).json({ error: 'المنتج غير موجود' });

  const store = db.prepare('SELECT * FROM stores WHERE id = ?').get(product.store_id);
  if (store.owner_id !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'لا تملك صلاحية التعديل' });
  }

  const fields = ['name', 'description', 'price', 'image', 'is_available'];
  const updates = [];
  const params = [];
  fields.forEach(f => {
    if (req.body[f] !== undefined) {
      updates.push(`${f} = ?`);
      params.push(req.body[f]);
    }
  });
  if (updates.length === 0) return res.status(400).json({ error: 'لا توجد بيانات للتعديل' });

  params.push(req.params.productId);
  db.prepare(`UPDATE products SET ${updates.join(', ')} WHERE id = ?`).run(...params);

  const updated = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.productId);
  res.json({ product: updated });
});

// حذف منتج
router.delete('/products/:productId', authRequired, requireRole('vendor', 'admin'), (req, res) => {
  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.productId);
  if (!product) return res.status(404).json({ error: 'المنتج غير موجود' });

  const store = db.prepare('SELECT * FROM stores WHERE id = ?').get(product.store_id);
  if (store.owner_id !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'لا تملك صلاحية الحذف' });
  }

  db.prepare('DELETE FROM products WHERE id = ?').run(req.params.productId);
  res.json({ success: true });
});

module.exports = router;
