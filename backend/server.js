require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

require('./db/database'); // يتأكد من إنشاء الجداول عند التشغيل

const authRoutes = require('./routes/auth');
const categoriesRoutes = require('./routes/categories');
const storesRoutes = require('./routes/stores');
const ordersRoutes = require('./routes/orders');
const locationsRoutes = require('./routes/locations');
const uploadRoutes = require('./routes/upload');
const walletRoutes = require('./routes/wallet');
const adminRoutes = require('./routes/admin');
const settingsRoutes = require('./routes/settings');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'السيرفر شغال 🚀' });
});

app.use('/api/auth', authRoutes);
app.use('/api/categories', categoriesRoutes);
app.use('/api/stores', storesRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api/locations', locationsRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/settings', settingsRoutes);

// 404
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'المسار غير موجود' });
});

// معالج أخطاء عام
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'حدث خطأ في السيرفر' });
});

app.listen(PORT, () => {
  console.log(`✅ السيرفر شغال على http://localhost:${PORT}`);
  console.log(`   جرب: http://localhost:${PORT}/api/health`);
});
