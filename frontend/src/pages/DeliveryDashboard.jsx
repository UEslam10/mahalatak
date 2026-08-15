import { useEffect, useState } from 'react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import StatusBadge from '../components/StatusBadge';
import WalletPanel from '../components/WalletPanel';

export default function DeliveryDashboard() {
  const { user } = useAuth();
  const [tab, setTab] = useState('available');
  const [available, setAvailable] = useState([]);
  const [mine, setMine] = useState([]);
  const [courierRate, setCourierRate] = useState(0.1);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState('');

  function loadAll() {
    setLoading(true);
    Promise.all([
      api.getAvailableDeliveries(user?.city),
      api.getMyDeliveries(),
      api.getRates(),
    ])
      .then(([availRes, mineRes, ratesRes]) => {
        setAvailable(availRes.orders);
        setMine(mineRes.orders);
        setCourierRate(ratesRes.courierCommissionRate);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => { loadAll(); }, []);

  function netEarning(deliveryFee) {
    return Math.round((deliveryFee * (1 - courierRate) + Number.EPSILON) * 100) / 100;
  }

  async function claim(order) {
    setBusyId(order.id);
    setError('');
    try {
      await api.claimOrder(order.id);
      loadAll();
      setTab('mine');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  async function markDelivered(order) {
    if (!window.confirm('متأكد إنك سلّمت الطلب واستلمت الفلوس من العميل؟')) return;
    setBusyId(order.id);
    setError('');
    try {
      await api.updateOrderStatus(order.id, 'delivered');
      loadAll();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  const activeMine = mine.filter((o) => o.status === 'out_for_delivery');
  const historyMine = mine.filter((o) => o.status === 'delivered' || o.status === 'cancelled');

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-extrabold mb-1">لوحة المندوب 🛵</h1>
      <p className="text-sm text-gray-500 mb-6">{user?.city}{user?.village ? ` - ${user.village}` : ''}</p>

      <div className="flex gap-2 mb-6 border-b border-gray-200 overflow-x-auto">
        <button
          onClick={() => setTab('available')}
          className={`px-4 py-2 font-semibold text-sm border-b-2 whitespace-nowrap ${tab === 'available' ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500'}`}
        >
          طلبات متاحة ({available.length})
        </button>
        <button
          onClick={() => setTab('mine')}
          className={`px-4 py-2 font-semibold text-sm border-b-2 whitespace-nowrap ${tab === 'mine' ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500'}`}
        >
          طلباتي الحالية ({activeMine.length})
        </button>
        <button
          onClick={() => setTab('history')}
          className={`px-4 py-2 font-semibold text-sm border-b-2 whitespace-nowrap ${tab === 'history' ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500'}`}
        >
          السجل ({historyMine.length})
        </button>
        <button
          onClick={() => setTab('wallet')}
          className={`px-4 py-2 font-semibold text-sm border-b-2 whitespace-nowrap ${tab === 'wallet' ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500'}`}
        >
          محفظتي 💰
        </button>
      </div>

      {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

      {loading ? (
        <p className="text-gray-400 text-center py-16">جاري التحميل...</p>
      ) : (
        <>
          {tab === 'available' && (
            available.length === 0 ? (
              <p className="text-gray-400 text-center py-16">لا توجد طلبات متاحة للاستلام حاليًا في مدينتك</p>
            ) : (
              <div className="space-y-3">
                {available.map((order) => (
                  <div key={order.id} className="bg-white border border-gray-100 rounded-2xl p-4">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold">طلب #{order.id} · {order.store_name}</span>
                      <span className="text-primary-600 font-extrabold">صافي أجرتك {netEarning(order.delivery_fee)} ج.م</span>
                    </div>
                    <p className="text-sm text-gray-500 mb-1">📍 استلام من: {order.store_address}</p>
                    <p className="text-sm text-gray-500 mb-3">🚩 توصيل إلى: {order.city} {order.village ? `- ${order.village}` : ''} - {order.address}</p>
                    <p className="text-sm text-gray-600 mb-3">
                      هتحصّل من العميل كاش: <span className="font-bold">{order.total} ج.م</span> وتسلّم المنصة الباقي بعد أجرتك
                    </p>
                    <button
                      onClick={() => claim(order)}
                      disabled={busyId === order.id}
                      className="bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white text-sm font-semibold px-4 py-2 rounded-full"
                    >
                      {busyId === order.id ? 'جاري الاستلام...' : 'استلم الطلب'}
                    </button>
                  </div>
                ))}
              </div>
            )
          )}

          {tab === 'mine' && (
            activeMine.length === 0 ? (
              <p className="text-gray-400 text-center py-16">مفيش طلبات حالية معاك</p>
            ) : (
              <div className="space-y-3">
                {activeMine.map((order) => (
                  <div key={order.id} className="bg-white border border-gray-100 rounded-2xl p-4">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold">طلب #{order.id} · {order.store_name}</span>
                      <StatusBadge status={order.status} />
                    </div>
                    <p className="text-sm text-gray-500 mb-1">📍 استلام من: {order.store_address} · {order.store_phone}</p>
                    <p className="text-sm text-gray-500 mb-2">🚩 توصيل إلى: {order.city} {order.village ? `- ${order.village}` : ''} - {order.address} · {order.phone}</p>
                    <p className="text-sm text-gray-600 mb-3">
                      حصّل من العميل: <span className="font-bold">{order.total} ج.م</span> (صافي أجرتك منها {netEarning(order.delivery_fee)} ج.م، والباقي بيتسلم للمنصة)
                    </p>
                    <button
                      onClick={() => markDelivered(order)}
                      disabled={busyId === order.id}
                      className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm font-semibold px-4 py-2 rounded-full"
                    >
                      {busyId === order.id ? 'جاري التأكيد...' : 'تم التسليم واستلمت الفلوس'}
                    </button>
                  </div>
                ))}
              </div>
            )
          )}

          {tab === 'history' && (
            historyMine.length === 0 ? (
              <p className="text-gray-400 text-center py-16">لا يوجد سجل طلبات بعد</p>
            ) : (
              <div className="space-y-2">
                {historyMine.map((order) => (
                  <div key={order.id} className="bg-white border border-gray-100 rounded-2xl p-3 flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-sm">طلب #{order.id} · {order.store_name}</p>
                      <p className="text-xs text-gray-500">أجرتك الصافية: {order.courier_amount} ج.م</p>
                    </div>
                    <StatusBadge status={order.status} />
                  </div>
                ))}
              </div>
            )
          )}

          {tab === 'wallet' && <WalletPanel role="delivery" />}
        </>
      )}
    </div>
  );
}
