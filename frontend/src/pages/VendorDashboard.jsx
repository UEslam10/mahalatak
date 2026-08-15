import { useEffect, useRef, useState } from 'react';
import { api } from '../api';
import StatusBadge from '../components/StatusBadge';
import ImageOrEmoji from '../components/ImageOrEmoji';
import ImageUpload from '../components/ImageUpload';
import WalletPanel from '../components/WalletPanel';
import { playNotificationBeep } from '../utils/notificationSound';

export default function VendorDashboard() {
  const [tab, setTab] = useState('stores'); // stores | orders | wallet
  const [stores, setStores] = useState([]);
  const [orders, setOrders] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedStore, setSelectedStore] = useState(null);
  const [showNewStoreForm, setShowNewStoreForm] = useState(false);
  const [newOrderToast, setNewOrderToast] = useState(false);
  const knownPendingCount = useRef(null); // null = لسه ماخدناش أول قراءة

  function loadAll() {
    setLoading(true);
    Promise.all([api.getMyStores(), api.getVendorOrders(), api.getCategories()])
      .then(([storesRes, ordersRes, catRes]) => {
        setStores(storesRes.stores);
        setOrders(ordersRes.orders);
        setCategories(catRes.categories);
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => { loadAll(); }, []);

  // كل 10 ثواني نتأكد هل فيه طلبات جديدة "قيد المراجعة" مجتش عليها تنبيه قبل كده
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const { count } = await api.getVendorPendingCount();
        if (knownPendingCount.current !== null && count > knownPendingCount.current) {
          playNotificationBeep();
          setNewOrderToast(true);
          loadAll();
          setTimeout(() => setNewOrderToast(false), 6000);
        }
        knownPendingCount.current = count;
      } catch {
        // تجاهل أي خطأ مؤقت في الشبكة، هيحاول تاني بعد 10 ثواني
      }
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  const pendingCount = orders.filter((o) => o.status === 'pending').length;

  if (loading) return <div className="text-center py-20 text-gray-400">جاري التحميل...</div>;

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      {newOrderToast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-primary-600 text-white text-sm font-bold px-5 py-3 rounded-full shadow-lg flex items-center gap-2">
          🔔 عندك طلب جديد!
        </div>
      )}

      <h1 className="text-2xl font-extrabold mb-6">لوحة التاجر</h1>

      <div className="flex gap-2 mb-6 border-b border-gray-200">
        <button
          onClick={() => setTab('stores')}
          className={`px-4 py-2 font-semibold text-sm border-b-2 ${tab === 'stores' ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500'}`}
        >
          محلاتي ({stores.length})
        </button>
        <button
          onClick={() => setTab('orders')}
          className={`px-4 py-2 font-semibold text-sm border-b-2 relative ${tab === 'orders' ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500'}`}
        >
          الطلبات الواردة ({orders.length})
          {pendingCount > 0 && (
            <span className="absolute -top-1 -left-1 bg-red-500 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center">
              {pendingCount}
            </span>
          )}
        </button>
        <button
          onClick={() => setTab('wallet')}
          className={`px-4 py-2 font-semibold text-sm border-b-2 ${tab === 'wallet' ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500'}`}
        >
          محفظتي 💰
        </button>
      </div>

      {tab === 'stores' && (
        selectedStore ? (
          <StoreManager
            store={selectedStore}
            onBack={() => { setSelectedStore(null); loadAll(); }}
          />
        ) : (
          <div>
            {stores.length === 0 && !showNewStoreForm && (
              <p className="text-gray-400 mb-4">لسه معندكش محلات، أضف محلك الأول 👇</p>
            )}

            <div className="grid sm:grid-cols-2 gap-3 mb-6">
              {stores.map((store) => (
                <button
                  key={store.id}
                  onClick={() => setSelectedStore(store)}
                  className="text-right bg-white border border-gray-100 rounded-2xl p-4 hover:shadow-sm"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-12 h-12 rounded-xl bg-primary-50 flex items-center justify-center text-3xl overflow-hidden shrink-0">
                      <ImageOrEmoji src={store.image} alt={store.name} className="w-full h-full object-cover" emojiClass="text-3xl" />
                    </span>
                    <div>
                      <h3 className="font-bold">{store.name}</h3>
                      <p className="text-xs text-gray-500">{store.city} {store.village ? `- ${store.village}` : ''}</p>
                    </div>
                  </div>
                  <span className={`inline-block mt-2 text-xs font-semibold px-2 py-0.5 rounded-full ${store.is_open ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {store.is_open ? 'مفتوح' : 'مغلق'}
                  </span>
                </button>
              ))}
            </div>

            {showNewStoreForm ? (
              <NewStoreForm
                categories={categories}
                onCancel={() => setShowNewStoreForm(false)}
                onCreated={() => { setShowNewStoreForm(false); loadAll(); }}
              />
            ) : (
              <button
                onClick={() => setShowNewStoreForm(true)}
                className="bg-primary-600 hover:bg-primary-700 text-white font-bold px-5 py-2.5 rounded-full"
              >
                + أضف محل جديد
              </button>
            )}
          </div>
        )
      )}

      {tab === 'orders' && (
        <VendorOrders orders={orders} onUpdated={loadAll} />
      )}

      {tab === 'wallet' && <WalletPanel role="vendor" />}
    </div>
  );
}

function NewStoreForm({ categories, onCancel, onCreated }) {
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
    <form onSubmit={handleSubmit} className="bg-white border border-gray-100 rounded-2xl p-5 space-y-3 mt-4 max-w-md">
      <h3 className="font-bold">محل جديد</h3>

      <ImageUpload value={form.image} onChange={(url) => update('image', url)} />

      <select
        value={form.category_id}
        onChange={(e) => update('category_id', e.target.value)}
        className="w-full border border-gray-300 rounded-xl px-3 py-2"
      >
        {categories.map((c) => (
          <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
        ))}
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

function StoreManager({ store, onBack }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNewProduct, setShowNewProduct] = useState(false);
  const [isOpen, setIsOpen] = useState(store.is_open === 1);
  const [image, setImage] = useState(store.image);
  const [imageError, setImageError] = useState('');

  function loadProducts() {
    setLoading(true);
    api.getStoreProducts(store.id).then(({ products }) => setProducts(products)).finally(() => setLoading(false));
  }

  useEffect(() => { loadProducts(); }, [store.id]);

  async function toggleOpen() {
    const next = isOpen ? 0 : 1;
    await api.updateStore(store.id, { is_open: next });
    setIsOpen(!!next);
  }

  async function changeImage(url) {
    setImageError('');
    const previous = image;
    setImage(url);
    try {
      await api.updateStore(store.id, { image: url });
    } catch (err) {
      setImage(previous); // رجّع الصورة القديمة لو الحفظ فشل فعليًا
      setImageError('الصورة اترفعت بس مطلعتش تتحفظ على المحل، حاول تاني: ' + err.message);
    }
  }

  async function toggleAvailable(product) {
    await api.updateProduct(product.id, { is_available: product.is_available ? 0 : 1 });
    loadProducts();
  }

  async function deleteProduct(product) {
    if (!window.confirm(`متأكد من حذف "${product.name}"؟`)) return;
    await api.deleteProduct(product.id);
    loadProducts();
  }

  return (
    <div>
      <button onClick={onBack} className="text-sm text-gray-500 hover:text-primary-600 mb-4">← رجوع للمحلات</button>

      <div className="bg-white border border-gray-100 rounded-2xl p-4 mb-6">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-3">
          <h2 className="text-xl font-extrabold">{store.name}</h2>
          <button
            onClick={toggleOpen}
            className={`text-sm font-semibold px-4 py-2 rounded-full ${isOpen ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}
          >
            {isOpen ? 'مفتوح الآن (اضغط للإغلاق)' : 'مغلق الآن (اضغط للفتح)'}
          </button>
        </div>
        <ImageUpload value={image} onChange={changeImage} />
        {imageError && <p className="text-red-500 text-xs font-semibold mt-2">⚠️ {imageError}</p>}
      </div>

      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold">المنتجات ({products.length})</h3>
        <button onClick={() => setShowNewProduct((v) => !v)} className="text-sm bg-primary-600 hover:bg-primary-700 text-white font-semibold px-4 py-2 rounded-full">
          {showNewProduct ? 'إغلاق' : '+ منتج جديد'}
        </button>
      </div>

      {showNewProduct && (
        <NewProductForm storeId={store.id} onCreated={() => { setShowNewProduct(false); loadProducts(); }} />
      )}

      {loading ? (
        <p className="text-gray-400 text-center py-10">جاري التحميل...</p>
      ) : products.length === 0 ? (
        <p className="text-gray-400 text-center py-10">لا توجد منتجات بعد</p>
      ) : (
        <div className="space-y-2 mt-4">
          {products.map((product) => (
            <div key={product.id} className="flex items-center gap-3 bg-white border border-gray-100 rounded-2xl p-3">
              <span className="w-12 h-12 rounded-xl bg-primary-50 flex items-center justify-center text-2xl overflow-hidden shrink-0">
                <ImageOrEmoji src={product.image} alt={product.name} className="w-full h-full object-cover" emojiClass="text-2xl" fallback="🛍️" />
              </span>
              <div className="flex-1">
                <h4 className="font-bold text-sm">{product.name}</h4>
                <p className="text-primary-600 font-extrabold text-sm">{product.price} ج.م</p>
              </div>
              <button
                onClick={() => toggleAvailable(product)}
                className={`text-xs font-semibold px-3 py-1.5 rounded-full ${product.is_available ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}
              >
                {product.is_available ? 'متاح' : 'غير متاح'}
              </button>
              <button onClick={() => deleteProduct(product)} className="text-red-500 text-sm px-2">🗑️</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function NewProductForm({ storeId, onCreated }) {
  const [form, setForm] = useState({ name: '', description: '', price: '', image: '🛍️' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!form.name || !form.price) {
      setError('اسم المنتج والسعر مطلوبين');
      return;
    }
    setLoading(true);
    try {
      await api.addProduct(storeId, { ...form, price: Number(form.price) });
      setForm({ name: '', description: '', price: '', image: '🛍️' });
      onCreated();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white border border-gray-100 rounded-2xl p-4 space-y-3 mb-4">
      <ImageUpload value={form.image} onChange={(url) => update('image', url)} />
      <div className="grid sm:grid-cols-2 gap-3">
        <input placeholder="اسم المنتج" value={form.name} onChange={(e) => update('name', e.target.value)} className="border border-gray-300 rounded-xl px-3 py-2" />
        <input placeholder="السعر" type="number" min="0" value={form.price} onChange={(e) => update('price', e.target.value)} className="border border-gray-300 rounded-xl px-3 py-2" />
        <input placeholder="وصف مختصر (اختياري)" value={form.description} onChange={(e) => update('description', e.target.value)} className="border border-gray-300 rounded-xl px-3 py-2 sm:col-span-2" />
      </div>
      {error && <p className="text-red-500 text-sm">{error}</p>}
      <button disabled={loading} className="bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white font-semibold px-5 py-2 rounded-full text-sm">
        {loading ? 'جاري الإضافة...' : 'إضافة المنتج'}
      </button>
    </form>
  );
}

function VendorOrders({ orders, onUpdated }) {
  const NEXT_STATUS = {
    pending: 'accepted',
    accepted: 'preparing',
    preparing: 'out_for_delivery',
  };
  const NEXT_LABEL = {
    pending: 'قبول الطلب',
    accepted: 'بدء التجهيز',
    preparing: 'خرج للتوصيل',
  };

  async function advance(order) {
    const next = NEXT_STATUS[order.status];
    if (!next) return;
    await api.updateOrderStatus(order.id, next);
    onUpdated();
  }

  async function selfDeliver(order) {
    if (!window.confirm('هتسلم الطلب بنفسك (بدون مندوب) وتستلم الفلوس من العميل؟')) return;
    await api.updateOrderStatus(order.id, 'delivered');
    onUpdated();
  }

  async function cancel(order) {
    if (!window.confirm('متأكد من إلغاء الطلب؟')) return;
    await api.updateOrderStatus(order.id, 'cancelled');
    onUpdated();
  }

  async function confirmPayment(order) {
    if (!window.confirm(`متأكد إنك استلمت تحويل ${order.total} ج.م من العميل؟`)) return;
    await api.confirmPayment(order.id);
    onUpdated();
  }

  if (orders.length === 0) return <p className="text-gray-400 text-center py-16">لا توجد طلبات واردة بعد</p>;

  return (
    <div className="space-y-3">
      {orders.map((order) => (
        <div key={order.id} className="bg-white border border-gray-100 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-1">
            <span className="font-bold">طلب #{order.id} · {order.store_name}</span>
            <StatusBadge status={order.status} />
          </div>
          <p className="text-sm text-gray-500 mb-1">العميل: {order.customer_name} · {order.phone}</p>
          <p className="text-sm text-gray-500 mb-2">📍 {order.city} {order.village ? `- ${order.village}` : ''} - {order.address}</p>
          <p className="font-bold text-gray-700 mb-1">{order.total} ج.م</p>

          {order.payment_method === 'e_wallet' && (
            <div className="mb-3">
              {order.payment_confirmed ? (
                <p className="text-sm text-green-600 font-semibold">✅ الدفع الإلكتروني اتأكد</p>
              ) : (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-2.5">
                  <p className="text-sm font-semibold text-amber-700">📱 دفع إلكتروني - محتاج تأكيد</p>
                  {order.payment_reference && <p className="text-xs text-gray-500">مرجع التحويل: {order.payment_reference}</p>}
                  <button
                    onClick={() => confirmPayment(order)}
                    className="mt-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold px-3 py-1.5 rounded-full"
                  >
                    تأكيد استلام التحويل
                  </button>
                </div>
              )}
            </div>
          )}

          {order.status === 'out_for_delivery' && (
            order.courier_name ? (
              <p className="text-sm text-primary-600 font-semibold">🛵 المندوب {order.courier_name} استلم الطلب وهيسلّمه</p>
            ) : (
              <div className="flex gap-2">
                <p className="text-xs text-gray-400 self-center">لسه محدش من المندوبين استلم الطلب،</p>
                <button
                  onClick={() => selfDeliver(order)}
                  className="bg-green-600 hover:bg-green-700 text-white text-sm font-semibold px-4 py-2 rounded-full"
                >
                  سلّمه بنفسك
                </button>
              </div>
            )
          )}

          {NEXT_STATUS[order.status] && (
            <div className="flex gap-2">
              <button
                onClick={() => advance(order)}
                className="bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold px-4 py-2 rounded-full"
              >
                {NEXT_LABEL[order.status]}
              </button>
              {order.status === 'pending' && (
                <button onClick={() => cancel(order)} className="text-red-500 text-sm font-semibold px-4 py-2">
                  رفض الطلب
                </button>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
