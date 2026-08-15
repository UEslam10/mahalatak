const express = require('express');
const db = require('../db/database');
const { authRequired, requireRole } = require('../middleware/auth');
const { settleOrderWallets } = require('../utils/wallet');

const router = express.Router();

const VALID_STATUSES = ['pending', 'accepted', 'preparing', 'out_for_delivery', 'delivered', 'cancelled'];

// إنشاء طلب جديد
router.post('/', authRequired, (req, res) => {
  const { store_id, items, city, village, address, phone, notes, payment_method, payment_reference } = req.body;

  if (!store_id || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'يجب اختيار محل ومنتجات للطلب' });
  }
  if (!city || !address || !phone) {
    return res.status(400).json({ error: 'المدينة والعنوان ورقم الموبايل مطلوبين' });
  }

  const paymentMethod = payment_method === 'e_wallet' ? 'e_wallet' : 'cash';
  if (paymentMethod === 'e_wallet' && !payment_reference?.trim()) {
    return res.status(400).json({ error: 'اكتب رقم أو مرجع التحويل عشان نقدر نتأكد من الدفع' });
  }

  const store = db.prepare('SELECT * FROM stores WHERE id = ?').get(store_id);
  if (!store) return res.status(404).json({ error: 'المحل غير موجود' });
  if (!store.is_open) return res.status(400).json({ error: 'المحل مغلق حاليًا' });

  // تحقق من المنتجات واحسب الإجمالي من السيرفر (منعًا للتلاعب بالسعر)
  let itemsTotal = 0;
  const validatedItems = [];

  for (const item of items) {
    const product = db.prepare('SELECT * FROM products WHERE id = ? AND store_id = ?').get(item.product_id, store_id);
    if (!product) {
      return res.status(400).json({ error: `منتج غير موجود في هذا المحل (id: ${item.product_id})` });
    }
    if (!product.is_available) {
      return res.status(400).json({ error: `المنتج "${product.name}" غير متاح حاليًا` });
    }
    const qty = Math.max(1, parseInt(item.quantity) || 1);
    itemsTotal += product.price * qty;
    validatedItems.push({ product, qty });
  }

  if (itemsTotal < store.min_order) {
    return res.status(400).json({ error: `الحد الأدنى للطلب من هذا المحل هو ${store.min_order} جنيه` });
  }

  const total = itemsTotal + store.delivery_fee;

  const insertOrder = db.prepare(`
    INSERT INTO orders (user_id, store_id, status, items_total, delivery_fee, total, city, village, address, phone, notes, payment_method, payment_reference)
    VALUES (?, ?, 'pending', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const orderInfo = insertOrder.run(
    req.user.id, store_id, itemsTotal, store.delivery_fee, total,
    city, village || null, address, phone, notes || null, paymentMethod, payment_reference?.trim() || null
  );

  const insertItem = db.prepare(`
    INSERT INTO order_items (order_id, product_id, product_name, quantity, price)
    VALUES (?, ?, ?, ?, ?)
  `);
  validatedItems.forEach(({ product, qty }) => {
    insertItem.run(orderInfo.lastInsertRowid, product.id, product.name, qty, product.price);
  });

  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderInfo.lastInsertRowid);
  const orderItems = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(order.id);

  res.status(201).json({ order: { ...order, items: orderItems } });
});

// طلبات المستخدم الحالي (كعميل)
router.get('/mine', authRequired, (req, res) => {
  const orders = db.prepare(`
    SELECT o.*, s.name as store_name, s.image as store_image,
      (SELECT COUNT(*) FROM reviews r WHERE r.order_id = o.id) as has_review
    FROM orders o JOIN stores s ON s.id = o.store_id
    WHERE o.user_id = ?
    ORDER BY o.created_at DESC
  `).all(req.user.id);
  res.json({ orders });
});

// طلبات محلات التاجر
router.get('/vendor', authRequired, (req, res) => {
  const orders = db.prepare(`
    SELECT o.*, s.name as store_name, u.name as customer_name, c.name as courier_name
    FROM orders o
    JOIN stores s ON s.id = o.store_id
    JOIN users u ON u.id = o.user_id
    LEFT JOIN users c ON c.id = o.courier_id
    WHERE s.owner_id = ?
    ORDER BY o.created_at DESC
  `).all(req.user.id);
  res.json({ orders });
});

// عدد الطلبات "قيد المراجعة" بس (نداء خفيف للتنبيه، بدل تحميل كل الطلبات كل شوية)
router.get('/vendor/pending-count', authRequired, requireRole('vendor', 'admin'), (req, res) => {
  const row = db.prepare(`
    SELECT COUNT(*) as count FROM orders o
    JOIN stores s ON s.id = o.store_id
    WHERE s.owner_id = ? AND o.status = 'pending'
  `).get(req.user.id);
  res.json({ count: row.count });
});

// الطلبات المتاحة للاستلام من المندوبين (خرجت للتوصيل ومفيش مندوب متعين عليها بعد)
router.get('/available-for-delivery', authRequired, requireRole('delivery', 'admin'), (req, res) => {
  const city = req.query.city || req.user.city;
  let sql = `
    SELECT o.*, s.name as store_name, s.address as store_address, s.phone as store_phone
    FROM orders o JOIN stores s ON s.id = o.store_id
    WHERE o.status = 'out_for_delivery' AND o.courier_id IS NULL
  `;
  const params = [];
  if (city) {
    sql += ' AND o.city = ?';
    params.push(city);
  }
  sql += ' ORDER BY o.created_at ASC';
  const orders = db.prepare(sql).all(...params);
  res.json({ orders });
});

// طلبات المندوب الحالي (اللي استلمها)
router.get('/delivery/mine', authRequired, requireRole('delivery', 'admin'), (req, res) => {
  const orders = db.prepare(`
    SELECT o.*, s.name as store_name, s.address as store_address, s.phone as store_phone
    FROM orders o JOIN stores s ON s.id = o.store_id
    WHERE o.courier_id = ?
    ORDER BY o.created_at DESC
  `).all(req.user.id);
  res.json({ orders });
});

// المندوب يستلم طلب (يتعين عليه)
router.post('/:id/claim', authRequired, requireRole('delivery', 'admin'), (req, res) => {
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
  if (!order) return res.status(404).json({ error: 'الطلب غير موجود' });
  if (order.status !== 'out_for_delivery') {
    return res.status(400).json({ error: 'الطلب لسه مش جاهز للاستلام من المندوب' });
  }
  if (order.courier_id) {
    return res.status(409).json({ error: 'الطلب اتاخد بالفعل من مندوب تاني' });
  }

  db.prepare('UPDATE orders SET courier_id = ? WHERE id = ?').run(req.user.id, req.params.id);
  const updated = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
  res.json({ order: updated });
});

// تفاصيل طلب واحد
router.get('/:id', authRequired, (req, res) => {
  const order = db.prepare(`
    SELECT o.*, s.name as store_name, s.owner_id as store_owner_id, c.name as courier_name, c.phone as courier_phone
    FROM orders o
    JOIN stores s ON s.id = o.store_id
    LEFT JOIN users c ON c.id = o.courier_id
    WHERE o.id = ?
  `).get(req.params.id);

  if (!order) return res.status(404).json({ error: 'الطلب غير موجود' });

  const isOwnerCustomer = order.user_id === req.user.id;
  const isOwnerVendor = order.store_owner_id === req.user.id;
  const isCourier = order.courier_id === req.user.id;
  if (!isOwnerCustomer && !isOwnerVendor && !isCourier && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'لا تملك صلاحية عرض هذا الطلب' });
  }

  const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(order.id);
  const review = db.prepare('SELECT * FROM reviews WHERE order_id = ?').get(order.id);
  res.json({ order: { ...order, items, review: review || null } });
});

// تقييم طلب بعد التسليم (العميل صاحب الطلب بس، وتقييم واحد لكل طلب)
router.post('/:id/review', authRequired, (req, res) => {
  const { rating, comment } = req.body;
  const ratingNum = Number(rating);
  if (!Number.isInteger(ratingNum) || ratingNum < 1 || ratingNum > 5) {
    return res.status(400).json({ error: 'التقييم لازم يكون رقم صحيح من 1 لـ 5' });
  }

  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
  if (!order) return res.status(404).json({ error: 'الطلب غير موجود' });
  if (order.user_id !== req.user.id) {
    return res.status(403).json({ error: 'التقييم متاح لصاحب الطلب بس' });
  }
  if (order.status !== 'delivered') {
    return res.status(400).json({ error: 'تقدر تقيّم الطلب بعد ما يتسلّم بس' });
  }

  const existing = db.prepare('SELECT id FROM reviews WHERE order_id = ?').get(order.id);
  if (existing) {
    return res.status(409).json({ error: 'قيّمت الطلب ده قبل كده' });
  }

  db.prepare(`
    INSERT INTO reviews (order_id, store_id, user_id, rating, comment)
    VALUES (?, ?, ?, ?, ?)
  `).run(order.id, order.store_id, req.user.id, ratingNum, comment?.trim() || null);

  // إعادة حساب متوسط تقييم المحل من كل التقييمات الحقيقية
  const agg = db.prepare('SELECT AVG(rating) as avg, COUNT(*) as count FROM reviews WHERE store_id = ?').get(order.store_id);
  db.prepare('UPDATE stores SET rating = ?, rating_count = ? WHERE id = ?').run(
    Math.round(agg.avg * 10) / 10, agg.count, order.store_id
  );

  const review = db.prepare('SELECT * FROM reviews WHERE order_id = ?').get(order.id);
  res.status(201).json({ review });
});

// تأكيد استلام تحويل الدفع الإلكتروني (التاجر صاحب المحل أو الأدمن)
router.patch('/:id/confirm-payment', authRequired, (req, res) => {
  const order = db.prepare(`
    SELECT o.*, s.owner_id as store_owner_id
    FROM orders o JOIN stores s ON s.id = o.store_id
    WHERE o.id = ?
  `).get(req.params.id);

  if (!order) return res.status(404).json({ error: 'الطلب غير موجود' });
  if (order.store_owner_id !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'لا تملك صلاحية تأكيد الدفع لهذا الطلب' });
  }
  if (order.payment_method !== 'e_wallet') {
    return res.status(400).json({ error: 'الطلب ده مش بدفع إلكتروني أصلًا' });
  }

  db.prepare('UPDATE orders SET payment_confirmed = 1 WHERE id = ?').run(order.id);
  const updated = db.prepare('SELECT * FROM orders WHERE id = ?').get(order.id);
  res.json({ order: updated });
});

// تحديث حالة الطلب
router.patch('/:id/status', authRequired, (req, res) => {
  const { status } = req.body;
  if (!VALID_STATUSES.includes(status)) {
    return res.status(400).json({ error: 'حالة غير صحيحة' });
  }

  const order = db.prepare(`
    SELECT o.*, s.owner_id as store_owner_id
    FROM orders o JOIN stores s ON s.id = o.store_id
    WHERE o.id = ?
  `).get(req.params.id);

  if (!order) return res.status(404).json({ error: 'الطلب غير موجود' });
  if (order.status === 'delivered' || order.status === 'cancelled') {
    return res.status(400).json({ error: 'الطلب مقفول بالفعل ومينفعش يتعدل' });
  }

  const isVendor = order.store_owner_id === req.user.id;
  const isCourier = order.courier_id === req.user.id;
  const isCustomer = order.user_id === req.user.id;
  const isAdmin = req.user.role === 'admin';

  if (status === 'delivered') {
    // تسليم الطلب: المندوب المتعين عليه (أو التاجر لو مفيش مندوب أصلًا، توصيل ذاتي) أو الأدمن
    const allowed = isAdmin || (order.courier_id ? isCourier : isVendor);
    if (!allowed) {
      return res.status(403).json({ error: 'تسليم الطلب متاح فقط للمندوب المتعين عليه' });
    }
  } else if (status === 'cancelled') {
    // الإلغاء: التاجر أو الأدمن في أي وقت، أو العميل نفسه بس لو الطلب لسه "قيد المراجعة" (قبل ما التاجر يقبله)
    const allowed = isAdmin || isVendor || (isCustomer && order.status === 'pending');
    if (!allowed) {
      return res.status(403).json({ error: isCustomer ? 'مينفعش تلغي الطلب بعد ما التاجر يقبله، كلم المحل مباشرة' : 'لا تملك صلاحية إلغاء هذا الطلب' });
    }
  } else {
    if (!isVendor && !isAdmin) {
      return res.status(403).json({ error: 'لا تملك صلاحية تعديل هذا الطلب' });
    }
  }

  db.prepare('UPDATE orders SET status = ? WHERE id = ?').run(status, req.params.id);

  if (status === 'delivered') {
    settleOrderWallets(order);
  }

  const updated = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
  res.json({ order: updated });
});

module.exports = router;
