import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import StatusBadge from '../components/StatusBadge';

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getMyOrders().then(({ orders }) => setOrders(orders)).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-center py-20 text-gray-400">جاري التحميل...</div>;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-extrabold mb-6">طلباتي</h1>

      {orders.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-gray-400 mb-4">لسه ملكش طلبات</p>
          <Link to="/" className="bg-primary-600 text-white font-bold px-6 py-3 rounded-full">تصفح المحلات</Link>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => (
            <Link
              key={order.id}
              to={`/orders/${order.id}`}
              className="block bg-white rounded-2xl border border-gray-100 p-4 hover:shadow-sm"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold">{order.store_image} {order.store_name}</span>
                <StatusBadge status={order.status} />
              </div>
              <div className="flex items-center justify-between text-sm text-gray-500">
                <span>طلب #{order.id} · {new Date(order.created_at).toLocaleDateString('ar-EG')}</span>
                <span className="font-bold text-gray-700">{order.total} ج.م</span>
              </div>
              {order.status === 'delivered' && !order.has_review && (
                <p className="text-xs text-primary-600 font-semibold mt-1">⭐ قيّم تجربتك مع المحل</p>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
