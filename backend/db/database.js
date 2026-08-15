const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'mahalak.db');
const db = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ============= الجداول =============

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  phone TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'customer', -- customer | vendor | admin
  city TEXT,
  village TEXT,
  address TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  icon TEXT DEFAULT '🏪',
  sort_order INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS stores (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  owner_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  category_id INTEGER NOT NULL REFERENCES categories(id),
  name TEXT NOT NULL,
  description TEXT,
  image TEXT,
  city TEXT NOT NULL,
  village TEXT,
  address TEXT,
  phone TEXT,
  is_open INTEGER DEFAULT 1,
  delivery_fee REAL DEFAULT 0,
  min_order REAL DEFAULT 0,
  rating REAL DEFAULT 5,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  store_id INTEGER NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price REAL NOT NULL,
  image TEXT,
  is_available INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id),
  store_id INTEGER NOT NULL REFERENCES stores(id),
  status TEXT NOT NULL DEFAULT 'pending', -- pending | accepted | preparing | out_for_delivery | delivered | cancelled
  items_total REAL NOT NULL,
  delivery_fee REAL NOT NULL DEFAULT 0,
  total REAL NOT NULL,
  city TEXT NOT NULL,
  village TEXT,
  address TEXT NOT NULL,
  phone TEXT NOT NULL,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS order_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES products(id),
  product_name TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  price REAL NOT NULL
);

-- سجل حركات المحفظة (لكل تاجر أو مندوب): كل حركة رصيد موثقة هنا
CREATE TABLE IF NOT EXISTS wallet_transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id),
  order_id INTEGER REFERENCES orders(id),
  type TEXT NOT NULL, -- order_earning | cash_collected | settlement | adjustment
  amount REAL NOT NULL, -- موجب = زيادة في الرصيد، سالب = نقصان
  balance_after REAL NOT NULL,
  description TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- إعدادات المنصة العامة (زي نسبة العمولة)
CREATE TABLE IF NOT EXISTS platform_settings (
  key TEXT PRIMARY KEY,
  value TEXT
);
INSERT OR IGNORE INTO platform_settings (key, value) VALUES ('commission_rate', '0.10');

-- المدن والقرى المتاحة على المنصة (يديرها الأدمن: إضافة وحذف)
CREATE TABLE IF NOT EXISTS locations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  city TEXT NOT NULL,
  village TEXT, -- NULL = صف يمثل المدينة نفسها بدون قرية محددة
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(city, village)
);

-- تقييمات العملاء الحقيقية بعد التسليم (تقييم واحد لكل طلب)
CREATE TABLE IF NOT EXISTS reviews (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL UNIQUE REFERENCES orders(id),
  store_id INTEGER NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id),
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
`);

// ============= Migrations آمنة (إضافة أعمدة جديدة لقاعدة بيانات موجودة بالفعل) =============
function columnExists(table, column) {
  return db.prepare(`PRAGMA table_info(${table})`).all().some((c) => c.name === column);
}
function addColumnIfMissing(table, columnDef) {
  const colName = columnDef.trim().split(/\s+/)[0];
  if (!columnExists(table, colName)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${columnDef}`);
  }
}

// role الآن ممكن يبقى: customer | vendor | delivery | admin
addColumnIfMissing('users', "wallet_balance REAL DEFAULT 0");
addColumnIfMissing('users', "is_active INTEGER DEFAULT 1");
addColumnIfMissing('users', "security_question TEXT");
addColumnIfMissing('users', "security_answer_hash TEXT");

addColumnIfMissing('orders', "courier_id INTEGER REFERENCES users(id)");
addColumnIfMissing('orders', "platform_commission REAL DEFAULT 0");
addColumnIfMissing('orders', "vendor_amount REAL DEFAULT 0");
addColumnIfMissing('orders', "courier_amount REAL DEFAULT 0");
addColumnIfMissing('orders', "courier_commission REAL DEFAULT 0");
addColumnIfMissing('orders', "delivered_at DATETIME");
addColumnIfMissing('orders', "payment_method TEXT DEFAULT 'cash'"); // cash | e_wallet
addColumnIfMissing('orders', "payment_reference TEXT"); // رقم/مرجع التحويل اللي كتبه العميل (اختياري)
addColumnIfMissing('orders', "payment_confirmed INTEGER DEFAULT 0"); // اتأكد التاجر/الأدمن من وصول التحويل الإلكتروني

addColumnIfMissing('stores', "rating_count INTEGER DEFAULT 0");
// الأرقام القديمة (رصيد افتراضي 5 من غير أي تقييم حقيقي) مش حقيقية، نصفرها لحد ما يجيلها تقييم فعلي
db.prepare('UPDATE stores SET rating = 0 WHERE rating_count = 0').run();

// عمولة المنصة من رسوم التوصيل (نصيب المندوب) - قيمة افتراضية
db.prepare(`INSERT OR IGNORE INTO platform_settings (key, value) VALUES ('courier_commission_rate', '0.10')`).run();

// أرقام الدفع الإلكتروني (فودافون كاش / إنستاباي) اللي هتظهر للعميل وقت اختيار الدفع الإلكتروني
db.prepare(`INSERT OR IGNORE INTO platform_settings (key, value) VALUES ('vodafone_cash_number', '')`).run();
db.prepare(`INSERT OR IGNORE INTO platform_settings (key, value) VALUES ('instapay_handle', '')`).run();

// بيانات التواصل اللي بتظهر في صفحة "تواصل معنا"
db.prepare(`INSERT OR IGNORE INTO platform_settings (key, value) VALUES ('support_phone', '')`).run();
db.prepare(`INSERT OR IGNORE INTO platform_settings (key, value) VALUES ('support_email', '')`).run();

// أول مرة: نعبي جدول المدن من أي مدن/قرى مستخدمة بالفعل في المحلات الحالية، عشان معدش يفقد المدن اللي كانت شغالة قبل إضافة الإدارة اليدوية
const locationsCount = db.prepare('SELECT COUNT(*) as c FROM locations').get().c;
if (locationsCount === 0) {
  const insertLoc = db.prepare('INSERT OR IGNORE INTO locations (city, village) VALUES (?, ?)');
  const existing = db.prepare('SELECT DISTINCT city, village FROM stores').all();
  const seen = new Set();
  existing.forEach((row) => {
    insertLoc.run(row.city, null); // نضمن وجود المدينة نفسها كصف
    seen.add(row.city);
    if (row.village) insertLoc.run(row.city, row.village);
  });
  // مدن افتراضية شائعة لو قاعدة البيانات جديدة تمامًا وملهاش محلات لسه
  if (existing.length === 0) {
    ['المنصورة', 'القاهرة', 'الإسكندرية', 'أسيوط', 'المنيا', 'دمياط'].forEach((c) => insertLoc.run(c, null));
  }
}

module.exports = db;
