const db = require('./database');
const bcrypt = require('bcryptjs');

console.log('🌱 بدء تعبئة البيانات التجريبية...');

// امسح البيانات القديمة (ترتيب مهم بسبب foreign keys)
db.exec(`
  DELETE FROM wallet_transactions;
  DELETE FROM order_items;
  DELETE FROM orders;
  DELETE FROM products;
  DELETE FROM stores;
  DELETE FROM categories;
  DELETE FROM users;
`);

// ============= الفئات (كل حاجة مش مطاعم بس) =============
const categories = [
  { name: 'مطاعم ومأكولات', icon: '🍔' },
  { name: 'سوبر ماركت', icon: '🛒' },
  { name: 'خضار وفاكهة', icon: '🥦' },
  { name: 'لحوم ودواجن وأسماك', icon: '🥩' },
  { name: 'مخابز وحلويات', icon: '🍞' },
  { name: 'صيدليات', icon: '💊' },
  { name: 'أدوات منزلية', icon: '🧺' },
  { name: 'ملابس وأزياء', icon: '👕' },
  { name: 'إلكترونيات وموبايلات', icon: '📱' },
  { name: 'مستلزمات أطفال', icon: '🍼' },
  { name: 'هدايا وورد', icon: '🎁' },
  { name: 'محطات غاز وأنابيب', icon: '🛢️' },
  { name: 'أدوات مكتبية وقرطاسية', icon: '📚' },
  { name: 'خدمات صيانة وسباكة', icon: '🔧' },
];

const insertCategory = db.prepare('INSERT INTO categories (name, icon, sort_order) VALUES (?, ?, ?)');
const categoryIds = {};
categories.forEach((c, i) => {
  const info = insertCategory.run(c.name, c.icon, i);
  categoryIds[c.name] = info.lastInsertRowid;
});

// ============= مستخدمين =============
const insertUser = db.prepare(`
  INSERT INTO users (name, phone, password_hash, role, city, village, address, security_question, security_answer_hash)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const passHash = bcrypt.hashSync('123456', 10);
const demoQuestion = 'ما اسم مدرستك الابتدائية؟';
const demoAnswerHash = bcrypt.hashSync('demo', 10);

const customerId = insertUser.run('أحمد محمد', '01000000001', passHash, 'customer', 'المنصورة', 'ميت سلسيل', 'شارع المدرسة', demoQuestion, demoAnswerHash).lastInsertRowid;
const vendor1 = insertUser.run('محمد سوبر ماركت', '01000000002', passHash, 'vendor', 'المنصورة', 'ميت سلسيل', 'أمام المسجد الكبير', demoQuestion, demoAnswerHash).lastInsertRowid;
const vendor2 = insertUser.run('صيدلية النور', '01000000003', passHash, 'vendor', 'المنصورة', 'ميت سلسيل', 'الشارع الرئيسي', demoQuestion, demoAnswerHash).lastInsertRowid;
const vendor3 = insertUser.run('مطعم بيتزا القرية', '01000000004', passHash, 'vendor', 'المنصورة', 'شربين', 'ميدان القرية', demoQuestion, demoAnswerHash).lastInsertRowid;
insertUser.run('أدمن النظام', '01000000000', passHash, 'admin', 'المنصورة', null, null, demoQuestion, demoAnswerHash);
insertUser.run('كريم المندوب', '01000000010', passHash, 'delivery', 'المنصورة', 'ميت سلسيل', 'شارع المحطة', demoQuestion, demoAnswerHash);
insertUser.run('سيد المندوب', '01000000011', passHash, 'delivery', 'المنصورة', 'شربين', 'شارع الجلاء', demoQuestion, demoAnswerHash);

// ============= محلات =============
const insertStore = db.prepare(`
  INSERT INTO stores (owner_id, category_id, name, description, image, city, village, address, phone, delivery_fee, min_order, rating)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const stores = [
  {
    owner: vendor1, cat: 'سوبر ماركت', name: 'سوبر ماركت البركة',
    desc: 'كل احتياجاتك اليومية في مكان واحد', image: '🛒',
    city: 'المنصورة', village: 'ميت سلسيل', address: 'أمام المسجد الكبير',
    phone: '01000000002', fee: 10, min: 30, rating: 4.7
  },
  {
    owner: vendor2, cat: 'صيدليات', name: 'صيدلية النور',
    desc: 'أدوية ومستلزمات طبية على مدار اليوم', image: '💊',
    city: 'المنصورة', village: 'ميت سلسيل', address: 'الشارع الرئيسي',
    phone: '01000000003', fee: 5, min: 0, rating: 4.9
  },
  {
    owner: vendor3, cat: 'مطاعم ومأكولات', name: 'مطعم بيتزا القرية',
    desc: 'بيتزا ومكرونة ووجبات سريعة', image: '🍕',
    city: 'المنصورة', village: 'شربين', address: 'ميدان القرية',
    phone: '01000000004', fee: 15, min: 50, rating: 4.5
  },
  {
    owner: null, cat: 'خضار وفاكهة', name: 'محل الخير للخضار',
    desc: 'خضار وفاكهة طازة يوميًا', image: '🥦',
    city: 'المنصورة', village: 'ميت سلسيل', address: 'السوق الكبير',
    phone: '01000000005', fee: 8, min: 20, rating: 4.6
  },
  {
    owner: null, cat: 'مخابز وحلويات', name: 'فرن أبو العز',
    desc: 'خبز بلدي وفينو ومعجنات طازة', image: '🍞',
    city: 'المنصورة', village: 'ميت سلسيل', address: 'شارع الفرن',
    phone: '01000000006', fee: 5, min: 10, rating: 4.8
  },
  {
    owner: null, cat: 'إلكترونيات وموبايلات', name: 'محل الأمانة للموبايلات',
    desc: 'موبايلات وإكسسوارات وصيانة', image: '📱',
    city: 'المنصورة', village: 'شربين', address: 'شارع السوق',
    phone: '01000000007', fee: 12, min: 0, rating: 4.4
  },
  {
    owner: null, cat: 'ملابس وأزياء', name: 'بوتيك الأناقة',
    desc: 'ملابس رجالي وحريمي بأسعار مناسبة', image: '👕',
    city: 'المنصورة', village: 'ميت سلسيل', address: 'شارع التجارة',
    phone: '01000000008', fee: 10, min: 0, rating: 4.3
  },
  {
    owner: null, cat: 'مستلزمات أطفال', name: 'محل بيبي لاند',
    desc: 'كل حاجة للأطفال والرضع', image: '🍼',
    city: 'المنصورة', village: 'ميت سلسيل', address: 'بجوار الصيدلية',
    phone: '01000000009', fee: 10, min: 0, rating: 4.7
  },
];

const storeIds = {};
stores.forEach(s => {
  const info = insertStore.run(
    s.owner, categoryIds[s.cat], s.name, s.desc, s.image,
    s.city, s.village, s.address, s.phone, s.fee, s.min, s.rating
  );
  storeIds[s.name] = info.lastInsertRowid;
});

// ============= منتجات =============
const insertProduct = db.prepare(`
  INSERT INTO products (store_id, name, description, price, image)
  VALUES (?, ?, ?, ?, ?)
`);

const productsByStore = {
  'سوبر ماركت البركة': [
    ['أرز أبو كف 1 كيلو', '', 45, '🍚'],
    ['زيت عافية 1 لتر', '', 90, '🛢️'],
    ['سكر 1 كيلو', '', 35, '🧂'],
    ['شاي ليبتون 100 كيس', '', 75, '🍵'],
    ['مياه معدنية 1.5 لتر', 'كرتونة 6 زجاجات', 60, '💧'],
    ['بيض بلدي', 'طبق 30 بيضة', 120, '🥚'],
  ],
  'صيدلية النور': [
    ['باراسيتامول', 'شريط 20 قرص', 15, '💊'],
    ['فيتامين سي فوار', 'علبة 20 قرص', 45, '🍊'],
    ['كمامات طبية', 'علبة 50 قطعة', 35, '😷'],
    ['كحول طبي 70%', '250 مل', 20, '🧴'],
    ['ترمومتر رقمي', '', 65, '🌡️'],
  ],
  'مطعم بيتزا القرية': [
    ['بيتزا مارجريتا وسط', '', 90, '🍕'],
    ['بيتزا سوبر سوبريم كبير', '', 150, '🍕'],
    ['مكرونة بشاميل', 'طبق فردي', 60, '🍝'],
    ['بطاطس مقلية', 'طبق وسط', 35, '🍟'],
    ['عصير مانجو طازة', '', 25, '🥭'],
  ],
  'محل الخير للخضار': [
    ['طماطم', 'كيلو', 15, '🍅'],
    ['بطاطس', 'كيلو', 12, '🥔'],
    ['موز', 'كيلو', 25, '🍌'],
    ['تفاح أحمر', 'كيلو', 35, '🍎'],
    ['خيار', 'كيلو', 10, '🥒'],
  ],
  'فرن أبو العز': [
    ['خبز بلدي', 'كيس 10 أرغفة', 10, '🍞'],
    ['فينو', 'كيس 10 حبات', 15, '🥖'],
    ['كحك بالعجوة', 'كيلو', 80, '🍪'],
    ['بسبوسة', 'صينية', 60, '🍮'],
  ],
  'محل الأمانة للموبايلات': [
    ['سماعة بلوتوث', '', 250, '🎧'],
    ['شاحن سريع 20 وات', '', 150, '🔌'],
    ['كفر موبايل', 'مقاسات متعددة', 40, '📱'],
    ['باور بانك 10000 مللي', '', 350, '🔋'],
  ],
  'بوتيك الأناقة': [
    ['تيشيرت رجالي قطن', '', 120, '👕'],
    ['بنطلون جينز', '', 250, '👖'],
    ['فستان حريمي كاجوال', '', 300, '👗'],
    ['طرحة شيفون', '', 90, '🧣'],
  ],
  'محل بيبي لاند': [
    ['حفاضات بيبي جوي', 'مقاس 3 - 60 قطعة', 180, '🍼'],
    ['لبن أطفال بيبيلاك', 'علبة 400 جرام', 220, '🍼'],
    ['مناديل مبللة', 'عبوة 80 قطعة', 25, '🧻'],
    ['عربة أطفال', '', 1500, '👶'],
  ],
};

Object.entries(productsByStore).forEach(([storeName, products]) => {
  const storeId = storeIds[storeName];
  products.forEach(([name, desc, price, image]) => {
    insertProduct.run(storeId, name, desc, price, image);
  });
});

console.log('✅ تم إدخال البيانات بنجاح!');
console.log(`   - ${categories.length} فئة`);
console.log(`   - ${stores.length} محل`);
console.log('👤 بيانات دخول تجريبية (كلمة السر للجميع: 123456):');
console.log('   عميل   : 01000000001');
console.log('   تاجر   : 01000000002 (سوبر ماركت البركة)');
console.log('   أدمن   : 01000000000');
console.log('   مندوب  : 01000000010 (كريم - المنصورة/ميت سلسيل)');
console.log('   مندوب  : 01000000011 (سيد - المنصورة/شربين)');
console.log('🔐 إجابة سؤال الأمان لكل الحسابات التجريبية: demo');
