import { useEffect, useState } from 'react';
import { api } from '../api';
import StatusBadge from '../components/StatusBadge';
import ImageOrEmoji from '../components/ImageOrEmoji';
import ImageUpload from '../components/ImageUpload';

const TABS = [
  { id: 'overview', label: 'نظرة عامة 📊' },
  { id: 'stores', label: 'المحلات 🏪' },
  { id: 'users', label: 'المستخدمين 👥' },
  { id: 'orders', label: 'الطلبات 📦' },
  { id: 'categories', label: 'الفئات 🗂️' },
  { id: 'locations', label: 'المدن والقرى 🗺️' },
  { id: 'settings', label: 'الإعدادات ⚙️' },
];

export default function AdminDashboard() {
  const [tab, setTab] = useState('overview');

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-extrabold mb-6">لوحة الأدمن 🛠️</h1>

      <div className="flex gap-2 mb-6 border-b border-gray-200 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 font-semibold text-sm border-b-2 whitespace-nowrap ${tab === t.id ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'overview' && <Overview />}
      {tab === 'stores' && <StoresTab />}
      {tab === 'users' && <UsersTab />}
      {tab === 'orders' && <OrdersTab />}
      {tab === 'categories' && <CategoriesTab />}
      {tab === 'locations' && <LocationsTab />}
      {tab === 'settings' && <SettingsTab />}
    </div>
  );
}

// ================= نظرة عامة =================
function Overview() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { api.getAdminStats().then(setStats).finally(() => setLoading(false)); }, []);

  if (loading) return <p className="text-gray-400 text-center py-16">جاري التحميل...</p>;
  if (!stats) return null;

  const roleCount = (role) => stats.usersCount.find((u) => u.role === role)?.count || 0;
  const statusCount = (status) => stats.ordersByStatus.find((o) => o.status === status)?.count || 0;

  return (
    <div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <StatCard label="عملاء" value={roleCount('customer')} icon="🙋" />
        <StatCard label="تجّار" value={roleCount('vendor')} icon="🏪" />
        <StatCard label="مندوبين" value={roleCount('delivery')} icon="🛵" />
        <StatCard label="محلات" value={`${stats.storesCount} (${stats.openStoresCount} مفتوح)`} icon="🏬" />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
        <StatCard label="عمولة المحلات الكلية" value={`${stats.revenue.total_commission.toFixed(2)} ج.م`} icon="💰" highlight />
        <StatCard label="عمولة التوصيل الكلية" value={`${stats.revenue.total_courier_commission.toFixed(2)} ج.م`} icon="🛵" highlight />
        <StatCard label="إجمالي المبيعات (طلبات مسلّمة)" value={`${stats.revenue.total_sales.toFixed(2)} ج.م`} icon="🧾" />
        <StatCard label="عدد الطلبات المسلّمة" value={stats.revenue.delivered_count} icon="✅" />
        <StatCard label="مستحقات تجّار (لم تُصرف)" value={`${stats.pendingVendorPayouts.toFixed(2)} ج.م`} icon="⏳" />
        <StatCard label="مستحق تحصيله من مندوبين" value={`${stats.pendingCourierCollections.toFixed(2)} ج.م`} icon="🧍" />
        <StatCard label="نسبة عمولة المحلات" value={`${Math.round(stats.commissionRate * 100)}%`} icon="📈" />
        <StatCard label="نسبة عمولة التوصيل" value={`${Math.round(stats.courierCommissionRate * 100)}%`} icon="📈" />
      </div>

      <h3 className="font-bold mb-3">الطلبات حسب الحالة</h3>
      <div className="flex flex-wrap gap-2">
        {['pending', 'accepted', 'preparing', 'out_for_delivery', 'delivered', 'cancelled'].map((s) => (
          <div key={s} className="bg-white border border-gray-100 rounded-xl px-4 py-3 flex items-center gap-2">
            <StatusBadge status={s} />
            <span className="font-bold">{statusCount(s)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatCard({ label, value, icon, highlight }) {
  return (
    <div className={`rounded-2xl p-4 border ${highlight ? 'bg-primary-50 border-primary-100' : 'bg-white border-gray-100'}`}>
      <div className="text-2xl mb-1">{icon}</div>
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className="font-extrabold text-lg">{value}</p>
    </div>
  );
}

// ================= المحلات =================
function StoresTab() {
  const [stores, setStores] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [error, setError] = useState('');

  function load() {
    setLoading(true);
    Promise.all([api.getAdminStores(q ? { q } : {}), api.getCategories()])
      .then(([storesRes, catRes]) => {
        setStores(storesRes.stores);
        setCategories(catRes.categories);
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  async function toggleOpen(store) {
    await api.updateStore(store.id, { is_open: store.is_open ? 0 : 1 });
    load();
  }

  async function remove(store) {
    if (!window.confirm(`متأكد من حذف "${store.name}"؟`)) return;
    setError('');
    try {
      await api.deleteStore(store.id);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-4 items-center">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && load()}
          placeholder="بحث باسم المحل..."
          className="border border-gray-300 rounded-xl px-3 py-2 text-sm flex-1 min-w-[180px]"
        />
        <button onClick={load} className="text-sm font-semibold bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-full">بحث</button>
        <button
          onClick={() => setShowNew((v) => !v)}
          className="text-sm font-semibold bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-full"
        >
          {showNew ? 'إغلاق' : '+ محل جديد'}
        </button>
      </div>

      {error && <p className="text-red-500 text-sm mb-3">{error}</p>}

      {showNew && (
        <AdminNewStoreForm categories={categories} onCreated={() => { setShowNew(false); load(); }} onCancel={() => setShowNew(false)} />
      )}

      {loading ? (
        <p className="text-gray-400 text-center py-16">جاري التحميل...</p>
      ) : stores.length === 0 ? (
        <p className="text-gray-400 text-center py-16">لا توجد محلات</p>
      ) : (
        <div className="space-y-2">
          {stores.map((store) => (
            <div key={store.id} className="bg-white border border-gray-100 rounded-2xl p-3 flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-primary-50 flex items-center justify-center overflow-hidden shrink-0">
                <ImageOrEmoji src={store.image} alt={store.name} className="w-full h-full object-cover" emojiClass="text-2xl" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm truncate">{store.name}</p>
                <p className="text-xs text-gray-500">{store.category_icon} {store.category_name} · {store.city} {store.village ? `- ${store.village}` : ''}</p>
                <p className="text-xs text-gray-400">صاحب المحل: {store.owner_name || 'بدون صاحب'} {store.owner_phone ? `· ${store.owner_phone}` : ''}</p>
              </div>
              <button
                onClick={() => toggleOpen(store)}
                className={`text-xs font-semibold px-3 py-1.5 rounded-full shrink-0 ${store.is_open ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}
              >
                {store.is_open ? 'مفتوح' : 'مغلق'}
              </button>
              <button onClick={() => remove(store)} className="text-red-500 text-lg px-2 shrink-0">🗑️</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AdminNewStoreForm({ categories, onCancel, onCreated }) {
  const [form, setForm] = useState({
    category_id: categories[0]?.id || '', name: '', description: '', image: '🏪',
    city: '', village: '', address: '', phone: '', delivery_fee: 10, min_order: 0,
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.createStore({ ...form, category_id: Number(form.category_id) });
      onCreated();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white border border-gray-100 rounded-2xl p-5 space-y-3 mb-6 max-w-md">
      <h3 className="font-bold">محل جديد (بدون صاحب - ممكن التاجر يتربط بيه لاحقًا)</h3>

      <ImageUpload value={form.image} onChange={(url) => update('image', url)} />

      <select value={form.category_id} onChange={(e) => update('category_id', e.target.value)} className="w-full border border-gray-300 rounded-xl px-3 py-2">
        {categories.map((c) => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
      </select>

      <input placeholder="اسم المحل" value={form.name} onChange={(e) => update('name', e.target.value)} className="w-full border border-gray-300 rounded-xl px-3 py-2" required />
      <textarea placeholder="وصف مختصر" value={form.description} onChange={(e) => update('description', e.target.value)} className="w-full border border-gray-300 rounded-xl px-3 py-2" rows={2} />
      <input placeholder="المدينة" value={form.city} onChange={(e) => update('city', e.target.value)} className="w-full border border-gray-300 rounded-xl px-3 py-2" required />
      <input placeholder="القرية / الحي" value={form.village} onChange={(e) => update('village', e.target.value)} className="w-full border border-gray-300 rounded-xl px-3 py-2" />
      <input placeholder="العنوان" value={form.address} onChange={(e) => update('address', e.target.value)} className="w-full border border-gray-300 rounded-xl px-3 py-2" required />
      <input placeholder="رقم الموبايل" value={form.phone} onChange={(e) => update('phone', e.target.value)} className="w-full border border-gray-300 rounded-xl px-3 py-2" required />

      <div className="flex gap-3">
        <div className="flex-1">
          <label className="block text-xs text-gray-500 mb-1">رسوم التوصيل</label>
          <input type="number" min="0" value={form.delivery_fee} onChange={(e) => update('delivery_fee', Number(e.target.value))} className="w-full border border-gray-300 rounded-xl px-3 py-2" />
        </div>
        <div className="flex-1">
          <label className="block text-xs text-gray-500 mb-1">الحد الأدنى للطلب</label>
          <input type="number" min="0" value={form.min_order} onChange={(e) => update('min_order', Number(e.target.value))} className="w-full border border-gray-300 rounded-xl px-3 py-2" />
        </div>
      </div>

      {error && <p className="text-red-500 text-sm">{error}</p>}

      <div className="flex gap-2 pt-2">
        <button type="button" onClick={onCancel} className="flex-1 border border-gray-300 rounded-xl py-2.5 font-semibold text-gray-600">إلغاء</button>
        <button disabled={loading} className="flex-1 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white rounded-xl py-2.5 font-semibold">
          {loading ? 'جاري الإضافة...' : 'إنشاء المحل'}
        </button>
      </div>
    </form>
  );
}

// ================= المستخدمين =================
const ROLE_LABELS = {
  customer: 'عميل 🙋', vendor: 'تاجر 🏪', delivery: 'مندوب 🛵', admin: 'أدمن 🛠️',
};

function UsersTab() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState('');
  const [q, setQ] = useState('');
  const [walletUser, setWalletUser] = useState(null);

  function load() {
    setLoading(true);
    const params = {};
    if (role) params.role = role;
    if (q) params.q = q;
    api.getAdminUsers(params).then((res) => setUsers(res.users)).finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, [role]);

  async function changeRole(user, newRole) {
    await api.updateAdminUser(user.id, { role: newRole });
    load();
  }

  async function toggleActive(user) {
    await api.updateAdminUser(user.id, { is_active: user.is_active ? 0 : 1 });
    load();
  }

  async function resetPassword(user) {
    const newPassword = window.prompt(`كلمة سر جديدة لـ ${user.name} (٦ أحرف على الأقل):`);
    if (!newPassword) return;
    try {
      await api.resetUserPassword(user.id, newPassword);
      alert('اتغيرت كلمة السر بنجاح');
    } catch (err) {
      alert(err.message);
    }
  }

  if (walletUser) {
    return <UserWalletView user={walletUser} onBack={() => { setWalletUser(null); load(); }} />;
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-4">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && load()}
          placeholder="بحث بالاسم أو الموبايل..."
          className="border border-gray-300 rounded-xl px-3 py-2 text-sm flex-1 min-w-[180px]"
        />
        <button onClick={load} className="text-sm font-semibold bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-full">بحث</button>
        <select value={role} onChange={(e) => setRole(e.target.value)} className="border border-gray-300 rounded-xl px-3 py-2 text-sm">
          <option value="">كل الأدوار</option>
          <option value="customer">عملاء</option>
          <option value="vendor">تجّار</option>
          <option value="delivery">مندوبين</option>
          <option value="admin">أدمن</option>
        </select>
      </div>

      {loading ? (
        <p className="text-gray-400 text-center py-16">جاري التحميل...</p>
      ) : users.length === 0 ? (
        <p className="text-gray-400 text-center py-16">لا يوجد مستخدمين</p>
      ) : (
        <div className="space-y-2">
          {users.map((u) => (
            <div key={u.id} className={`bg-white border rounded-2xl p-3 flex flex-wrap items-center gap-3 ${u.is_active ? 'border-gray-100' : 'border-red-200 opacity-70'}`}>
              <div className="flex-1 min-w-[160px]">
                <p className="font-bold text-sm">{u.name}</p>
                <p className="text-xs text-gray-500">{u.phone} · {u.city}{u.village ? ` - ${u.village}` : ''}</p>
              </div>

              <select
                value={u.role}
                onChange={(e) => changeRole(u, e.target.value)}
                className="text-xs border border-gray-300 rounded-full px-2 py-1.5"
              >
                {Object.entries(ROLE_LABELS).map(([r, label]) => <option key={r} value={r}>{label}</option>)}
              </select>

              {(u.role === 'vendor' || u.role === 'delivery') && (
                <button
                  onClick={() => setWalletUser(u)}
                  className="text-xs font-semibold px-3 py-1.5 rounded-full bg-blue-50 text-blue-700"
                >
                  💰 {u.wallet_balance >= 0 ? '+' : ''}{u.wallet_balance.toFixed(2)}
                </button>
              )}

              <button
                onClick={() => toggleActive(u)}
                className={`text-xs font-semibold px-3 py-1.5 rounded-full ${u.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}
              >
                {u.is_active ? 'نشط' : 'موقوف'}
              </button>

              <button
                onClick={() => resetPassword(u)}
                className="text-xs font-semibold px-3 py-1.5 rounded-full bg-gray-100 text-gray-600"
              >
                🔑 إعادة تعيين كلمة السر
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function UserWalletView({ user, onBack }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  function load() {
    setLoading(true);
    api.getAdminWallet(user.id).then(setData).finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  async function settle(e) {
    e.preventDefault();
    setError('');
    const val = Number(amount);
    if (!val) { setError('اكتب مبلغ صحيح'); return; }
    setBusy(true);
    try {
      await api.settleWallet(user.id, { amount: val, note });
      setAmount('');
      setNote('');
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (loading || !data) return <p className="text-gray-400 text-center py-16">جاري التحميل...</p>;

  const balance = data.user.wallet_balance;

  return (
    <div>
      <button onClick={onBack} className="text-sm text-gray-500 hover:text-primary-600 mb-4">← رجوع للمستخدمين</button>

      <div className="bg-white border border-gray-100 rounded-2xl p-5 mb-6">
        <h2 className="text-lg font-extrabold">{user.name} <span className="text-sm text-gray-500 font-normal">({ROLE_LABELS[user.role]})</span></h2>
        <p className="text-sm text-gray-500 mb-3">{user.phone}</p>
        <p className={`text-2xl font-extrabold ${balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
          {balance.toFixed(2)} ج.م {balance >= 0 ? '(مستحق له)' : '(مستحق عليه)'}
        </p>
      </div>

      <form onSubmit={settle} className="bg-white border border-gray-100 rounded-2xl p-4 mb-6 space-y-3 max-w-md">
        <h3 className="font-bold text-sm">تسوية يدوية</h3>
        <p className="text-xs text-gray-500">
          اكتب مبلغ موجب لو هتضيف رصيد له (تحصيل كاش من مندوب)، أو سالب لو هتصرفله فلوس (دفع مستحقات تاجر).
          <br />لتصفير الرصيد بالكامل: اكتب <b>{(-balance).toFixed(2)}</b>
        </p>
        <input
          type="number" step="0.01" placeholder="المبلغ (+/-)"
          value={amount} onChange={(e) => setAmount(e.target.value)}
          className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm"
        />
        <input
          placeholder="ملاحظة (اختياري)"
          value={note} onChange={(e) => setNote(e.target.value)}
          className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm"
        />
        {error && <p className="text-red-500 text-xs">{error}</p>}
        <button disabled={busy} className="bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white text-sm font-semibold px-4 py-2 rounded-full">
          {busy ? 'جاري التنفيذ...' : 'تنفيذ التسوية'}
        </button>
      </form>

      <h3 className="font-bold mb-3">سجل الحركات</h3>
      {data.transactions.length === 0 ? (
        <p className="text-gray-400 text-center py-10">لا توجد حركات بعد</p>
      ) : (
        <div className="space-y-2">
          {data.transactions.map((t) => (
            <div key={t.id} className="bg-white border border-gray-100 rounded-xl p-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold">{t.type}</p>
                {t.description && <p className="text-xs text-gray-500">{t.description}</p>}
                <p className="text-[11px] text-gray-400 mt-0.5">{new Date(t.created_at).toLocaleString('ar-EG')}</p>
              </div>
              <p className={`font-bold shrink-0 ${t.amount >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                {t.amount >= 0 ? '+' : ''}{t.amount.toFixed(2)}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ================= الطلبات =================
function OrdersTab() {
  const [orders, setOrders] = useState([]);
  const [couriers, setCouriers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('');

  function load() {
    setLoading(true);
    Promise.all([
      api.getAdminOrders(status ? { status } : {}),
      api.getAdminUsers({ role: 'delivery' }),
    ])
      .then(([ordersRes, usersRes]) => {
        setOrders(ordersRes.orders);
        setCouriers(usersRes.users);
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, [status]);

  async function assign(order, courierId) {
    await api.assignCourier(order.id, courierId ? Number(courierId) : null);
    load();
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-4">
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="border border-gray-300 rounded-xl px-3 py-2 text-sm">
          <option value="">كل الحالات</option>
          <option value="pending">قيد المراجعة</option>
          <option value="accepted">تم القبول</option>
          <option value="preparing">جاري التجهيز</option>
          <option value="out_for_delivery">في الطريق</option>
          <option value="delivered">تم التوصيل</option>
          <option value="cancelled">ملغي</option>
        </select>
      </div>

      {loading ? (
        <p className="text-gray-400 text-center py-16">جاري التحميل...</p>
      ) : orders.length === 0 ? (
        <p className="text-gray-400 text-center py-16">لا توجد طلبات</p>
      ) : (
        <div className="space-y-2">
          {orders.map((order) => (
            <div key={order.id} className="bg-white border border-gray-100 rounded-2xl p-3">
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-sm">طلب #{order.id} · {order.store_name}</span>
                <StatusBadge status={order.status} />
              </div>
              <p className="text-xs text-gray-500 mb-1">العميل: {order.customer_name} · {order.city} {order.village ? `- ${order.village}` : ''}</p>
              <p className="text-xs text-gray-500 mb-2">
                الإجمالي: {order.total} ج.م {order.status === 'delivered' && `· عمولة المنصة: ${order.platform_commission} ج.م`}
                {order.payment_method === 'e_wallet' && (
                  <span className={`mr-2 font-semibold ${order.payment_confirmed ? 'text-green-600' : 'text-amber-600'}`}>
                    · 📱 دفع إلكتروني {order.payment_confirmed ? '(مؤكد)' : '(بانتظار التأكيد)'}
                  </span>
                )}
              </p>

              {order.status === 'out_for_delivery' && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">المندوب:</span>
                  <select
                    value={order.courier_id || ''}
                    onChange={(e) => assign(order, e.target.value)}
                    className="text-xs border border-gray-300 rounded-full px-2 py-1"
                  >
                    <option value="">بدون مندوب</option>
                    {couriers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              )}
              {order.courier_name && order.status !== 'out_for_delivery' && (
                <p className="text-xs text-gray-400">المندوب: {order.courier_name}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ================= الفئات =================
function CategoriesTab() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [newForm, setNewForm] = useState({ name: '', icon: '🏪' });
  const [busy, setBusy] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', icon: '' });

  function load() {
    setLoading(true);
    api.getAdminCategories().then((res) => setCategories(res.categories)).finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  async function addCategory(e) {
    e.preventDefault();
    if (!newForm.name.trim()) return;
    setError('');
    setBusy(true);
    try {
      await api.addAdminCategory(newForm);
      setNewForm({ name: '', icon: '🏪' });
      setShowNew(false);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  function startEdit(cat) {
    setEditingId(cat.id);
    setEditForm({ name: cat.name, icon: cat.icon });
  }

  async function saveEdit(id) {
    setError('');
    setBusy(true);
    try {
      await api.updateAdminCategory(id, editForm);
      setEditingId(null);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function removeCategory(cat) {
    if (!window.confirm(`متأكد من حذف فئة "${cat.name}"؟`)) return;
    setError('');
    try {
      await api.deleteAdminCategory(cat.id);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div>
      <button
        onClick={() => setShowNew((v) => !v)}
        className="mb-4 bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold px-4 py-2 rounded-full"
      >
        {showNew ? 'إغلاق' : '+ فئة جديدة'}
      </button>

      {showNew && (
        <form onSubmit={addCategory} className="bg-white border border-gray-100 rounded-2xl p-4 mb-6 max-w-md flex gap-2 items-end">
          <div className="w-20">
            <label className="block text-xs text-gray-500 mb-1">إيموجي</label>
            <input
              value={newForm.icon}
              onChange={(e) => setNewForm((f) => ({ ...f, icon: e.target.value }))}
              className="w-full border border-gray-300 rounded-xl px-3 py-2 text-center text-xl"
            />
          </div>
          <div className="flex-1">
            <label className="block text-xs text-gray-500 mb-1">اسم الفئة</label>
            <input
              value={newForm.name}
              onChange={(e) => setNewForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="مثلاً: عطارة"
              className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm"
            />
          </div>
          <button disabled={busy} className="bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white text-sm font-semibold px-4 py-2 rounded-full">
            إضافة
          </button>
        </form>
      )}

      {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

      {loading ? (
        <p className="text-gray-400 text-center py-16">جاري التحميل...</p>
      ) : categories.length === 0 ? (
        <p className="text-gray-400 text-center py-16">لا توجد فئات</p>
      ) : (
        <div className="space-y-2">
          {categories.map((cat) => (
            <div key={cat.id} className="bg-white border border-gray-100 rounded-2xl p-3 flex items-center gap-3">
              {editingId === cat.id ? (
                <>
                  <input
                    value={editForm.icon}
                    onChange={(e) => setEditForm((f) => ({ ...f, icon: e.target.value }))}
                    className="w-14 border border-gray-300 rounded-xl px-2 py-1.5 text-center text-xl"
                  />
                  <input
                    value={editForm.name}
                    onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                    className="flex-1 border border-gray-300 rounded-xl px-3 py-1.5 text-sm"
                  />
                  <button onClick={() => saveEdit(cat.id)} disabled={busy} className="text-green-600 text-sm font-semibold px-2">حفظ</button>
                  <button onClick={() => setEditingId(null)} className="text-gray-400 text-sm px-2">إلغاء</button>
                </>
              ) : (
                <>
                  <span className="text-2xl w-8 text-center">{cat.icon}</span>
                  <div className="flex-1">
                    <p className="font-bold text-sm">{cat.name}</p>
                    <p className="text-xs text-gray-400">{cat.stores_count} محل بيستخدمها</p>
                  </div>
                  <button onClick={() => startEdit(cat)} className="text-gray-400 hover:text-primary-600 text-sm px-2">✏️</button>
                  <button onClick={() => removeCategory(cat)} className="text-red-500 text-lg px-2">🗑️</button>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ================= المدن والقرى =================
function LocationsTab() {
  const [locations, setLocations] = useState([]); // صفوف خام: {id, city, village}
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [newCity, setNewCity] = useState('');
  const [villageInputs, setVillageInputs] = useState({}); // { [city]: 'نص القرية الجديدة' }
  const [busy, setBusy] = useState(false);

  function load() {
    setLoading(true);
    api.getAdminLocations().then((res) => setLocations(res.locations)).finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  // تجميع الصفوف حسب المدينة عشان نعرضها منظمة
  const cities = {};
  locations.forEach((loc) => {
    if (!cities[loc.city]) cities[loc.city] = { cityRow: null, villages: [] };
    if (loc.village) cities[loc.city].villages.push(loc);
    else cities[loc.city].cityRow = loc;
  });

  async function addCity(e) {
    e.preventDefault();
    if (!newCity.trim()) return;
    setError('');
    setBusy(true);
    try {
      await api.addAdminLocation({ city: newCity.trim() });
      setNewCity('');
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function addVillage(city) {
    const village = (villageInputs[city] || '').trim();
    if (!village) return;
    setError('');
    setBusy(true);
    try {
      await api.addAdminLocation({ city, village });
      setVillageInputs((v) => ({ ...v, [city]: '' }));
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function removeLocation(id) {
    setError('');
    try {
      await api.deleteAdminLocation(id);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div>
      <form onSubmit={addCity} className="bg-white border border-gray-100 rounded-2xl p-4 mb-6 max-w-md">
        <h3 className="font-bold mb-2">إضافة مدينة جديدة</h3>
        <div className="flex gap-2">
          <input
            value={newCity}
            onChange={(e) => setNewCity(e.target.value)}
            placeholder="اسم المدينة (مثلاً: طنطا)"
            className="flex-1 border border-gray-300 rounded-xl px-3 py-2 text-sm"
          />
          <button
            disabled={busy}
            className="bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white text-sm font-semibold px-4 py-2 rounded-full"
          >
            إضافة
          </button>
        </div>
      </form>

      {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

      {loading ? (
        <p className="text-gray-400 text-center py-16">جاري التحميل...</p>
      ) : Object.keys(cities).length === 0 ? (
        <p className="text-gray-400 text-center py-16">لا توجد مدن مضافة بعد</p>
      ) : (
        <div className="space-y-4">
          {Object.entries(cities).map(([city, data]) => (
            <div key={city} className="bg-white border border-gray-100 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold">{city}</h3>
                {data.cityRow && (
                  <button
                    onClick={() => removeLocation(data.cityRow.id)}
                    disabled={data.villages.length > 0}
                    title={data.villages.length > 0 ? 'احذف القرى التابعة الأول' : 'حذف المدينة'}
                    className="text-red-500 text-sm px-2 disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    🗑️ حذف المدينة
                  </button>
                )}
              </div>

              {data.villages.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {data.villages.map((v) => (
                    <span key={v.id} className="flex items-center gap-1 bg-primary-50 text-primary-700 text-xs font-semibold px-3 py-1.5 rounded-full">
                      {v.village}
                      <button onClick={() => removeLocation(v.id)} className="text-primary-400 hover:text-red-500">✕</button>
                    </span>
                  ))}
                </div>
              )}

              <div className="flex gap-2">
                <input
                  value={villageInputs[city] || ''}
                  onChange={(e) => setVillageInputs((v) => ({ ...v, [city]: e.target.value }))}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addVillage(city))}
                  placeholder="إضافة قرية/حي جديد..."
                  className="flex-1 border border-gray-300 rounded-xl px-3 py-1.5 text-sm"
                />
                <button
                  onClick={() => addVillage(city)}
                  disabled={busy}
                  className="text-sm font-semibold bg-gray-100 hover:bg-gray-200 disabled:opacity-50 px-3 py-1.5 rounded-full"
                >
                  إضافة
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ================= الإعدادات =================
function SettingsTab() {
  const [rate, setRate] = useState('');
  const [courierRate, setCourierRate] = useState('');
  const [vodafoneCashNumber, setVodafoneCashNumber] = useState('');
  const [instapayHandle, setInstapayHandle] = useState('');
  const [supportPhone, setSupportPhone] = useState('');
  const [supportEmail, setSupportEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api.getAdminSettings()
      .then((res) => {
        setRate(String(Math.round(res.commissionRate * 100)));
        setCourierRate(String(Math.round(res.courierCommissionRate * 100)));
        setVodafoneCashNumber(res.vodafoneCashNumber || '');
        setInstapayHandle(res.instapayHandle || '');
        setSupportPhone(res.supportPhone || '');
        setSupportEmail(res.supportEmail || '');
      })
      .finally(() => setLoading(false));
  }, []);

  async function save(e) {
    e.preventDefault();
    setError('');
    setSaved(false);
    const pct = Number(rate);
    const courierPct = Number(courierRate);
    if (Number.isNaN(pct) || pct < 0 || pct > 100) {
      setError('نسبة عمولة المحل لازم تكون رقم بين 0 و 100');
      return;
    }
    if (Number.isNaN(courierPct) || courierPct < 0 || courierPct > 100) {
      setError('نسبة عمولة التوصيل لازم تكون رقم بين 0 و 100');
      return;
    }
    setSaving(true);
    try {
      await api.updateAdminSettings({
        commissionRate: pct / 100,
        courierCommissionRate: courierPct / 100,
        vodafoneCashNumber,
        instapayHandle,
        supportPhone,
        supportEmail,
      });
      setSaved(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="text-gray-400 text-center py-16">جاري التحميل...</p>;

  return (
    <form onSubmit={save} className="bg-white border border-gray-100 rounded-2xl p-5 max-w-sm space-y-5">
      <div>
        <h3 className="font-bold">عمولة المنصة من المحلات</h3>
        <p className="text-xs text-gray-500 mb-2">بتتخصم من قيمة المنتجات في كل طلب (مش رسوم التوصيل) وبتتحسب تلقائيًا عند تسليم كل طلب.</p>
        <div className="flex items-center gap-2">
          <input
            type="number" min="0" max="100" step="1"
            value={rate} onChange={(e) => setRate(e.target.value)}
            className="w-24 border border-gray-300 rounded-xl px-3 py-2 text-center font-bold"
          />
          <span className="font-bold">%</span>
        </div>
      </div>

      <div>
        <h3 className="font-bold">عمولة المنصة من رسوم التوصيل</h3>
        <p className="text-xs text-gray-500 mb-2">بتتخصم من أجرة المندوب في كل طلب، بنفس منطق عمولة المحل.</p>
        <div className="flex items-center gap-2">
          <input
            type="number" min="0" max="100" step="1"
            value={courierRate} onChange={(e) => setCourierRate(e.target.value)}
            className="w-24 border border-gray-300 rounded-xl px-3 py-2 text-center font-bold"
          />
          <span className="font-bold">%</span>
        </div>
      </div>

      <div className="border-t border-gray-100 pt-4">
        <h3 className="font-bold">أرقام الدفع الإلكتروني</h3>
        <p className="text-xs text-gray-500 mb-2">بتظهر للعميل وقت اختيار "محفظة إلكترونية" في إتمام الطلب. سيب أي حقل فاضي لو مش هتفعّله.</p>
        <label className="block text-xs font-semibold mb-1">رقم فودافون كاش</label>
        <input
          value={vodafoneCashNumber}
          onChange={(e) => setVodafoneCashNumber(e.target.value)}
          placeholder="01xxxxxxxxx"
          dir="ltr"
          className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm mb-3"
        />
        <label className="block text-xs font-semibold mb-1">حساب إنستاباي</label>
        <input
          value={instapayHandle}
          onChange={(e) => setInstapayHandle(e.target.value)}
          placeholder="username@instapay"
          className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm"
        />
      </div>

      <div className="border-t border-gray-100 pt-4">
        <h3 className="font-bold">بيانات التواصل</h3>
        <p className="text-xs text-gray-500 mb-2">بتظهر في صفحة "تواصل معنا".</p>
        <label className="block text-xs font-semibold mb-1">رقم الدعم</label>
        <input
          value={supportPhone}
          onChange={(e) => setSupportPhone(e.target.value)}
          placeholder="01xxxxxxxxx"
          dir="ltr"
          className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm mb-3"
        />
        <label className="block text-xs font-semibold mb-1">إيميل الدعم</label>
        <input
          value={supportEmail}
          onChange={(e) => setSupportEmail(e.target.value)}
          placeholder="support@example.com"
          dir="ltr"
          className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm"
        />
      </div>

      {error && <p className="text-red-500 text-sm">{error}</p>}
      {saved && <p className="text-green-600 text-sm">تم الحفظ ✅</p>}
      <button disabled={saving} className="bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white font-semibold px-5 py-2 rounded-full text-sm">
        {saving ? 'جاري الحفظ...' : 'حفظ'}
      </button>
    </form>
  );
}
