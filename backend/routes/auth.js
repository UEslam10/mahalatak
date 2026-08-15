const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db/database');
const { JWT_SECRET, authRequired } = require('../middleware/auth');

const router = express.Router();

function signToken(user) {
  return jwt.sign(
    { id: user.id, name: user.name, phone: user.phone, role: user.role },
    JWT_SECRET,
    { expiresIn: '30d' }
  );
}

function publicUser(u) {
  const { password_hash, security_answer_hash, ...rest } = u;
  return rest;
}

// توحيد صيغة الإجابة قبل التجزئة/المقارنة (نتجاهل المسافات الزيادة واختلاف الحالة)
function normalizeAnswer(answer) {
  return String(answer).trim().toLowerCase();
}

// تسجيل مستخدم جديد
router.post('/register', (req, res) => {
  const { name, phone, password, role, city, village, address, security_question, security_answer } = req.body;

  if (!name || !phone || !password) {
    return res.status(400).json({ error: 'الاسم ورقم الموبايل وكلمة السر مطلوبين' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'كلمة السر يجب أن تكون 6 أحرف على الأقل' });
  }
  if (!security_question || !security_answer || !security_answer.trim()) {
    return res.status(400).json({ error: 'سؤال الأمان وإجابته مطلوبين (بيساعدوك تسترجع حسابك لو نسيت كلمة السر)' });
  }

  const existing = db.prepare('SELECT id FROM users WHERE phone = ?').get(phone);
  if (existing) {
    return res.status(409).json({ error: 'رقم الموبايل مسجل بالفعل' });
  }

  const hash = bcrypt.hashSync(password, 10);
  const answerHash = bcrypt.hashSync(normalizeAnswer(security_answer), 10);
  const allowedRole = ['vendor', 'delivery'].includes(role) ? role : 'customer';

  const info = db.prepare(`
    INSERT INTO users (name, phone, password_hash, role, city, village, address, security_question, security_answer_hash)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(name, phone, hash, allowedRole, city || null, village || null, address || null, security_question, answerHash);

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(info.lastInsertRowid);
  const token = signToken(user);
  res.status(201).json({ token, user: publicUser(user) });
});

// تسجيل الدخول
router.post('/login', (req, res) => {
  const { phone, password } = req.body;
  if (!phone || !password) {
    return res.status(400).json({ error: 'رقم الموبايل وكلمة السر مطلوبين' });
  }

  const user = db.prepare('SELECT * FROM users WHERE phone = ?').get(phone);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'رقم الموبايل أو كلمة السر غير صحيحة' });
  }
  if (user.is_active === 0) {
    return res.status(403).json({ error: 'تم إيقاف هذا الحساب، تواصل مع الإدارة' });
  }

  const token = signToken(user);
  res.json({ token, user: publicUser(user) });
});

// بيانات المستخدم الحالي
router.get('/me', authRequired, (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  if (!user) return res.status(404).json({ error: 'المستخدم غير موجود' });
  res.json({ user: publicUser(user) });
});

// تعديل البروفايل (الاسم والموقع) - رقم الموبايل والدور مبيتغيروش من هنا
router.patch('/me', authRequired, (req, res) => {
  const { name, city, village, address } = req.body;
  const updates = [];
  const params = [];
  if (name !== undefined) {
    if (!name.trim()) return res.status(400).json({ error: 'الاسم مينفعش يبقى فاضي' });
    updates.push('name = ?');
    params.push(name.trim());
  }
  if (city !== undefined) { updates.push('city = ?'); params.push(city || null); }
  if (village !== undefined) { updates.push('village = ?'); params.push(village || null); }
  if (address !== undefined) { updates.push('address = ?'); params.push(address || null); }

  if (updates.length === 0) return res.status(400).json({ error: 'لا توجد بيانات للتعديل' });

  params.push(req.user.id);
  db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...params);

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  res.json({ user: publicUser(user) });
});

// تغيير كلمة السر (المستخدم نفسه، لازم يعرف كلمة السر الحالية)
router.post('/change-password', authRequired, (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'كلمة السر الحالية والجديدة مطلوبين' });
  }
  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'كلمة السر الجديدة يجب أن تكون 6 أحرف على الأقل' });
  }

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  if (!bcrypt.compareSync(currentPassword, user.password_hash)) {
    return res.status(401).json({ error: 'كلمة السر الحالية غير صحيحة' });
  }

  const hash = bcrypt.hashSync(newPassword, 10);
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hash, req.user.id);
  res.json({ success: true });
});

// ============= نسيت كلمة السر (عن طريق سؤال الأمان) =============

// خطوة 1: يبعت رقم موبايله، نرجعله سؤال الأمان بتاعه
router.post('/forgot-password/question', (req, res) => {
  const { phone } = req.body;
  if (!phone) return res.status(400).json({ error: 'رقم الموبايل مطلوب' });

  const user = db.prepare('SELECT security_question FROM users WHERE phone = ?').get(phone);
  if (!user || !user.security_question) {
    return res.status(404).json({ error: 'مفيش حساب بالرقم ده معاه سؤال أمان محفوظ. تواصل مع الإدارة' });
  }
  res.json({ question: user.security_question });
});

// خطوة 2: يبعت الإجابة وكلمة السر الجديدة
router.post('/forgot-password/reset', (req, res) => {
  const { phone, answer, newPassword } = req.body;
  if (!phone || !answer || !newPassword) {
    return res.status(400).json({ error: 'كل البيانات مطلوبة' });
  }
  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'كلمة السر الجديدة يجب أن تكون 6 أحرف على الأقل' });
  }

  const user = db.prepare('SELECT * FROM users WHERE phone = ?').get(phone);
  if (!user || !user.security_answer_hash) {
    return res.status(404).json({ error: 'مفيش حساب بالرقم ده معاه سؤال أمان محفوظ. تواصل مع الإدارة' });
  }
  if (!bcrypt.compareSync(normalizeAnswer(answer), user.security_answer_hash)) {
    return res.status(401).json({ error: 'الإجابة غير صحيحة' });
  }

  const hash = bcrypt.hashSync(newPassword, 10);
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hash, user.id);
  res.json({ success: true });
});

module.exports = router;
