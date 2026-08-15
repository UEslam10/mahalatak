const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db/database');
const { authRequired, requireRole } = require('../middleware/auth');
const { getCommissionRate, setCommissionRate, getCourierCommissionRate, setCourierCommissionRate, creditWallet, round2 } = require('../utils/wallet');

const router = express.Router();

// كل الراوتس هنا للأدمن بس
router.use(authRequired, requireRole('admin'));

// ============= إحصائيات عامة =============
router.get('/stats', (req, res) => {
  const usersCount = db.prepare(`
    SELECT role, COUNT(*) as count FROM users GROUP BY role
  `).all();

  const storesCount = db.prepare('SELECT COUNT(*) as count FROM stores').get().count;
  const openStoresCount = db.prepare('SELECT COUNT(*) as count FROM stores WHERE is_open = 1').get().count;

  const ordersByStatus = db.prepare(`
    SELECT status, COUNT(*) as count FROM orders GROUP BY status
  `).all();

  const revenue = db.prepare(`
    SELECT
      COALESCE(SUM(platform_commission), 0) as total_commission,
      COALESCE(SUM(courier_commission), 0) as total_courier_commission,
      COALESCE(SUM(items_total), 0) as total_items,
      COALESCE(SUM(total), 0) as total_sales,
      COUNT(*) as delivered_count
    FROM orders WHERE status = 'delivered'
  `).get();

  const pendingVendorPayouts = db.prepare(`
    SELECT COALESCE(SUM(wallet_balance), 0) as total FROM users WHERE role = 'vendor' AND wallet_balance > 0
  `).get().total;

  const pendingCourierCollections = db.prepare(`
    SELECT COALESCE(SUM(-wallet_balance), 0) as total FROM users WHERE role = 'delivery' AND wallet_balance < 0
  `).get().total;

  res.json({
    usersCount,
    storesCount,
    openStoresCount,
    ordersByStatus,
    revenue,
    pendingVendorPayouts,
    pendingCourierCollections,
    commissionRate: getCommissionRate(),
    courierCommissionRate: getCourierCommissionRate(),
  });
});

// ============= المستخدمين =============
router.get('/users', (req, res) => {
  const { role, q } = req.query;
  let sql = 'SELECT id, name, phone, role, city, village, address, wallet_balance, is_active, created_at FROM users WHERE 1=1';
  const params = [];
  if (role) {
    sql += ' AND role = ?';
    params.push(role);
  }
  if (q) {
    sql += ' AND (name LIKE ? OR phone LIKE ?)';
    params.push(`%${q}%`, `%${q}%`);
  }
  sql += ' ORDER BY created_at DESC';
  const users = db.prepare(sql).all(...params);
  res.json({ users });
});

router.patch('/users/:id', (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!user) return res.status(404).json({ error: 'المستخدم غير موجود' });

  const fields = ['role', 'is_active', 'city', 'village', 'address', 'name'];
  const validRoles = ['customer', 'vendor', 'delivery', 'admin'];
  if (req.body.role !== undefined && !validRoles.includes(req.body.role)) {
    return res.status(400).json({ error: 'دور غير صحيح' });
  }

  const updates = [];
  const params = [];
  fields.forEach((f) => {
    if (req.body[f] !== undefined) {
      updates.push(`${f} = ?`);
      params.push(req.body[f]);
    }
  });
  if (updates.length === 0) return res.status(400).json({ error: 'لا توجد بيانات للتعديل' });

  params.push(req.params.id);
  db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...params);

  const updated = db.prepare('SELECT id, name, phone, role, city, village, address, wallet_balance, is_active FROM users WHERE id = ?').get(req.params.id);
  res.json({ user: updated });
});

// إعادة تعيين كلمة سر مستخدم (لما ينسى كلمة السر وسؤال الأمان مش متسجل، أو محتاج مساعدة الإدارة)
router.post('/users/:id/reset-password', (req, res) => {
  const user = db.prepare('SELECT id FROM users WHERE id = ?').get(req.params.id);
  if (!user) return res.status(404).json({ error: 'المستخدم غير موجود' });

  const { newPassword } = req.body;
  if (!newPassword || newPassword.length < 6) {
    return res.status(400).json({ error: 'كلمة السر الجديدة يجب أن تكون 6 أحرف على الأقل' });
  }

  const hash = bcrypt.hashSync(newPassword, 10);
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hash, req.params.id);
  res.json({ success: true });
});

// ============= المحلات =============
router.get('/stores', (req, res) => {
  const { q, city } = req.query;
  let sql = `
    SELECT s.*, c.name as category_name, c.icon as category_icon, u.name as owner_name, u.phone as owner_phone
    FROM stores s
    JOIN categories c ON c.id = s.category_id
    LEFT JOIN users u ON u.id = s.owner_id
    WHERE 1=1
  `;
  const params = [];
  if (q) {
    sql += ' AND s.name LIKE ?';
    params.push(`%${q}%`);
  }
  if (city) {
    sql += ' AND s.city = ?';
    params.push(city);
  }
  sql += ' ORDER BY s.created_at DESC';
  const stores = db.prepare(sql).all(...params);
  res.json({ stores });
});

// ============= الطلبات =============
router.get('/orders', (req, res) => {
  const { status, city } = req.query;
  let sql = `
    SELECT o.*, s.name as store_name, u.name as customer_name, c.name as courier_name
    FROM orders o
    JOIN stores s ON s.id = o.store_id
    JOIN users u ON u.id = o.user_id
    LEFT JOIN users c ON c.id = o.courier_id
    WHERE 1=1
  `;
  const params = [];
  if (status) {
    sql += ' AND o.status = ?';
    params.push(status);
  }
  if (city) {
    sql += ' AND o.city = ?';
    params.push(city);
  }
  sql += ' ORDER BY o.created_at DESC LIMIT 300';
  const orders = db.prepare(sql).all(...params);
  res.json({ orders });
});

// تعيين مندوب لطلب يدويًا
router.patch('/orders/:id/assign-courier', (req, res) => {
  const { courier_id } = req.body;
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
  if (!order) return res.status(404).json({ error: 'الطلب غير موجود' });

  if (courier_id) {
    const courier = db.prepare("SELECT * FROM users WHERE id = ? AND role = 'delivery'").get(courier_id);
    if (!courier) return res.status(400).json({ error: 'المندوب غير موجود' });
  }

  db.prepare('UPDATE orders SET courier_id = ? WHERE id = ?').run(courier_id || null, req.params.id);
  const updated = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
  res.json({ order: updated });
});

// ============= الإعدادات =============
function getPlainSetting(key) {
  const row = db.prepare('SELECT value FROM platform_settings WHERE key = ?').get(key);
  return row ? row.value : '';
}
function setPlainSetting(key, value) {
  db.prepare(`
    INSERT INTO platform_settings (key, value) VALUES (?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value
  `).run(key, value);
}

router.get('/settings', (req, res) => {
  res.json({
    commissionRate: getCommissionRate(),
    courierCommissionRate: getCourierCommissionRate(),
    vodafoneCashNumber: getPlainSetting('vodafone_cash_number'),
    instapayHandle: getPlainSetting('instapay_handle'),
    supportPhone: getPlainSetting('support_phone'),
    supportEmail: getPlainSetting('support_email'),
  });
});

router.patch('/settings', (req, res) => {
  const { commissionRate, courierCommissionRate, vodafoneCashNumber, instapayHandle, supportPhone, supportEmail } = req.body;

  if (commissionRate !== undefined) {
    const rate = parseFloat(commissionRate);
    if (Number.isNaN(rate) || rate < 0 || rate > 1) {
      return res.status(400).json({ error: 'نسبة عمولة المحل يجب أن تكون رقم بين 0 و 1 (مثلاً 0.1 = 10%)' });
    }
    setCommissionRate(rate);
  }

  if (courierCommissionRate !== undefined) {
    const rate = parseFloat(courierCommissionRate);
    if (Number.isNaN(rate) || rate < 0 || rate > 1) {
      return res.status(400).json({ error: 'نسبة عمولة التوصيل يجب أن تكون رقم بين 0 و 1 (مثلاً 0.1 = 10%)' });
    }
    setCourierCommissionRate(rate);
  }

  if (vodafoneCashNumber !== undefined) setPlainSetting('vodafone_cash_number', vodafoneCashNumber.trim());
  if (instapayHandle !== undefined) setPlainSetting('instapay_handle', instapayHandle.trim());
  if (supportPhone !== undefined) setPlainSetting('support_phone', supportPhone.trim());
  if (supportEmail !== undefined) setPlainSetting('support_email', supportEmail.trim());

  res.json({
    commissionRate: getCommissionRate(),
    courierCommissionRate: getCourierCommissionRate(),
    vodafoneCashNumber: getPlainSetting('vodafone_cash_number'),
    instapayHandle: getPlainSetting('instapay_handle'),
    supportPhone: getPlainSetting('support_phone'),
    supportEmail: getPlainSetting('support_email'),
  });
});

// ============= المحافظ =============
router.get('/wallet/:userId', (req, res) => {
  const user = db.prepare('SELECT id, name, phone, role, wallet_balance FROM users WHERE id = ?').get(req.params.userId);
  if (!user) return res.status(404).json({ error: 'المستخدم غير موجود' });
  const transactions = db.prepare(`
    SELECT * FROM wallet_transactions WHERE user_id = ? ORDER BY created_at DESC LIMIT 200
  `).all(req.params.userId);
  res.json({ user, transactions });
});

// تسوية يدوية (دفع مستحقات لتاجر، أو تحصيل كاش من مندوب)
router.post('/wallet/:userId/settle', (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.userId);
  if (!user) return res.status(404).json({ error: 'المستخدم غير موجود' });

  let { amount, note } = req.body;
  amount = parseFloat(amount);
  if (Number.isNaN(amount) || amount === 0) {
    return res.status(400).json({ error: 'المبلغ مطلوب ويجب ألا يساوي صفر' });
  }

  const newBalance = creditWallet(
    user.id,
    null,
    'settlement',
    round2(amount),
    note || (amount > 0 ? 'تسوية / إيداع من الإدارة' : 'تسوية / سحب بمعرفة الإدارة')
  );

  res.json({ balance: newBalance });
});

// ============= الفئات =============
router.get('/categories', (req, res) => {
  const categories = db.prepare(`
    SELECT c.*, COUNT(s.id) as stores_count
    FROM categories c
    LEFT JOIN stores s ON s.category_id = c.id
    GROUP BY c.id
    ORDER BY c.sort_order ASC, c.id ASC
  `).all();
  res.json({ categories });
});

router.post('/categories', (req, res) => {
  const { name, icon, sort_order } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'اسم الفئة مطلوب' });
  }
  const info = db.prepare('INSERT INTO categories (name, icon, sort_order) VALUES (?, ?, ?)')
    .run(name.trim(), icon?.trim() || '🏪', Number.isFinite(sort_order) ? sort_order : 0);
  const row = db.prepare('SELECT * FROM categories WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json({ category: row });
});

router.patch('/categories/:id', (req, res) => {
  const cat = db.prepare('SELECT * FROM categories WHERE id = ?').get(req.params.id);
  if (!cat) return res.status(404).json({ error: 'الفئة غير موجودة' });

  const fields = ['name', 'icon', 'sort_order'];
  const updates = [];
  const params = [];
  fields.forEach((f) => {
    if (req.body[f] !== undefined) {
      updates.push(`${f} = ?`);
      params.push(req.body[f]);
    }
  });
  if (updates.length === 0) return res.status(400).json({ error: 'لا توجد بيانات للتعديل' });

  params.push(req.params.id);
  db.prepare(`UPDATE categories SET ${updates.join(', ')} WHERE id = ?`).run(...params);
  const updated = db.prepare('SELECT * FROM categories WHERE id = ?').get(req.params.id);
  res.json({ category: updated });
});

router.delete('/categories/:id', (req, res) => {
  const cat = db.prepare('SELECT * FROM categories WHERE id = ?').get(req.params.id);
  if (!cat) return res.status(404).json({ error: 'الفئة غير موجودة' });

  const storesCount = db.prepare('SELECT COUNT(*) as c FROM stores WHERE category_id = ?').get(req.params.id).c;
  if (storesCount > 0) {
    return res.status(400).json({ error: `فيه ${storesCount} محل مستخدم الفئة دي، غيّر فئتهم الأول أو امسحهم` });
  }

  db.prepare('DELETE FROM categories WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// ============= المدن والقرى =============
router.get('/locations', (req, res) => {
  const rows = db.prepare('SELECT * FROM locations ORDER BY city, village').all();
  res.json({ locations: rows });
});

// إضافة مدينة (village فاضية) أو قرية جديدة تحت مدينة
router.post('/locations', (req, res) => {
  const { city, village } = req.body;
  if (!city || !city.trim()) {
    return res.status(400).json({ error: 'اسم المدينة مطلوب' });
  }
  const cityVal = city.trim();
  const villageVal = village?.trim() || null;

  // فحص يدوي للتكرار: SQLite مبيعتبرش NULL = NULL في قيود UNIQUE، فصف المدينة (village=NULL) لازم نتأكد منه يدويًا
  const duplicate = villageVal
    ? db.prepare('SELECT id FROM locations WHERE city = ? AND village = ?').get(cityVal, villageVal)
    : db.prepare('SELECT id FROM locations WHERE city = ? AND village IS NULL').get(cityVal);
  if (duplicate) {
    return res.status(409).json({ error: 'المدينة/القرية دي مضافة بالفعل' });
  }

  try {
    const info = db.prepare('INSERT INTO locations (city, village) VALUES (?, ?)').run(cityVal, villageVal);
    const row = db.prepare('SELECT * FROM locations WHERE id = ?').get(info.lastInsertRowid);
    res.status(201).json({ location: row });
  } catch (err) {
    if (String(err.message).includes('UNIQUE')) {
      return res.status(409).json({ error: 'المدينة/القرية دي مضافة بالفعل' });
    }
    res.status(400).json({ error: 'حدث خطأ أثناء الإضافة' });
  }
});

// حذف مدينة أو قرية من القائمة
router.delete('/locations/:id', (req, res) => {
  const loc = db.prepare('SELECT * FROM locations WHERE id = ?').get(req.params.id);
  if (!loc) return res.status(404).json({ error: 'غير موجود' });

  // لو ده صف مدينة (بدون قرية) وفيه قرى تابعة ليها، لازم يتحذفوا الأول
  if (!loc.village) {
    const childVillages = db.prepare('SELECT COUNT(*) as c FROM locations WHERE city = ? AND village IS NOT NULL').get(loc.city).c;
    if (childVillages > 0) {
      return res.status(400).json({ error: 'المدينة دي ليها قرى تابعة، احذف القرى الأول' });
    }
  }

  db.prepare('DELETE FROM locations WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

module.exports = router;
