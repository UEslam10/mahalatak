import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import StatusBadge from '../components/StatusBadge';
import StarRating from '../components/StarRating';
import { playNotificationBeep } from '../utils/notificationSound';

const STEPS = ['pending', 'accepted', 'preparing', 'out_for_delivery', 'delivered'];
const STEP_LABELS = {
  pending: 'قيد المراجعة',
  accepted: 'تم القبول',
  preparing: 'جاري التجهيز',
  out_for_delivery: 'في الطريق',
  delivered: 'تم التوصيل',
};

export default function OrderDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const cart = useCart();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState('');
  const [statusToast, setStatusToast] = useState('');
  const [reordering, setReordering] = useState(false);
  const knownStatus = useRef(null);

  function load() {
    api.getOrder(id).then(({ order }) => {
      if (knownStatus.current !== null && order.status !== knownStatus.current) {
        playNotificationBeep();
        setStatusToast(`تحديث: الطلب بقى "${STEP_LABELS[order.status] || order.status}"`);
        setTimeout(() => setStatusToast(''), 6000);
      }
      knownStatus.current = order.status;
      setOrder(order);
    }).finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
    const interval = setInterval(load, 8000); // تحديث تلقائي كل 8 ثواني لمتابعة حالة الطلب
    return () => clearInterval(interval);
  }, [id]);

  async function cancelOrder() {
    if (!window.confirm('متأكد إنك عايز تلغي الطلب؟')) return;
    setCancelling(true);
    setCancelError('');
    try {
      await api.updateOrderStatus(id, 'cancelled');
      load();
    } catch (err) {
      setCancelError(err.message);
    } finally {
      setCancelling(false);
    }
  }

  async function reorder() {
    setReordering(true);
    try {
      const { products } = await api.getStoreProducts(order.store_id);
      const availableIds = new Set(products.filter((p) => p.is_available).map((p) => p.id));
      const skipped = order.items.filter((i) => !availableIds.has(i.product_id));

      cart.clearCart();
      order.items
        .filter((i) => availableIds.has(i.product_id))
        .forEach((i) => {
          const product = products.find((p) => p.id === i.product_id);
          for (let k = 0; k < i.quantity; k++) {
            cart.addItem(product, { id: order.store_id, name: order.store_name });
          }
        });

      if (skipped.length > 0) {
        alert(`${skipped.length} منتج مبقاش متاح ومتضافش للعربة: ${skipped.map((s) => s.product_name).join('، ')}`);
      }
      navigate('/cart');
    } catch (err) {
      alert('حصل خطأ، حاول تاني: ' + err.message);
    } finally {
      setReordering(false);
    }
  }

  if (loading) return <div className="text-center py-20 text-gray-400">جاري التحميل...</div>;
  if (!order) return <div className="text-center py-20 text-gray-400">الطلب غير موجود</div>;

  const currentStepIndex = STEPS.indexOf(order.status);
  const isCancelled = order.status === 'cancelled';

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      {statusToast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-primary-600 text-white text-sm font-bold px-5 py-3 rounded-full shadow-lg">
          🔔 {statusToast}
        </div>
      )}

      <Link to="/orders" className="text-sm text-gray-500 hover:text-primary-600">← رجوع لطلباتي</Link>

      <div className="flex items-center justify-between mt-2 mb-6">
        <h1 className="text-2xl font-extrabold">طلب #{order.id}</h1>
        <StatusBadge status={order.status} />
      </div>

      {order.status === 'pending' && user?.id === order.user_id && (
        <div className="mb-6">
          <button
            onClick={cancelOrder}
            disabled={cancelling}
            className="text-red-600 border border-red-200 hover:bg-red-50 disabled:opacity-50 text-sm font-semibold px-4 py-2 rounded-full"
          >
            {cancelling ? 'جاري الإلغاء...' : 'إلغاء الطلب'}
          </button>
          {cancelError && <p className="text-red-500 text-xs mt-2">{cancelError}</p>}
        </div>
      )}

      {/* تتبع الحالة */}
      {!isCancelled && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-6">
          <div className="flex justify-between items-center">
            {STEPS.map((step, i) => (
              <div key={step} className="flex-1 flex flex-col items-center relative">
                {i > 0 && (
                  <div
                    className={`absolute right-1/2 top-3 h-0.5 w-full -z-0 ${i <= currentStepIndex ? 'bg-primary-500' : 'bg-gray-200'}`}
                  />
                )}
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold z-10 ${i <= currentStepIndex ? 'bg-primary-500 text-white' : 'bg-gray-200 text-gray-400'}`}
                >
                  {i <= currentStepIndex ? '✓' : ''}
                </div>
                <span className="text-[10px] text-gray-500 mt-1 text-center">{STEP_LABELS[step]}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-4">
        <h2 className="font-bold mb-2">المنتجات</h2>
        {order.items.map((item) => (
          <div key={item.id} className="flex justify-between text-sm text-gray-600 py-1">
            <span>{item.product_name} × {item.quantity}</span>
            <span>{item.price * item.quantity} ج.م</span>
          </div>
        ))}
        <div className="border-t border-gray-100 mt-2 pt-2 space-y-1 text-sm">
          <div className="flex justify-between text-gray-500">
            <span>إجمالي المنتجات</span>
            <span>{order.items_total} ج.م</span>
          </div>
          <div className="flex justify-between text-gray-500">
            <span>رسوم التوصيل</span>
            <span>{order.delivery_fee} ج.م</span>
          </div>
          <div className="flex justify-between font-bold text-base">
            <span>الإجمالي</span>
            <span>{order.total} ج.م</span>
          </div>
          <div className="flex justify-between text-gray-500 pt-1">
            <span>طريقة الدفع</span>
            <span>
              {order.payment_method === 'e_wallet'
                ? (order.payment_confirmed ? '📱 دفع إلكتروني (اتأكد ✅)' : '📱 دفع إلكتروني (بانتظار التأكيد)')
                : '💵 كاش عند الاستلام'}
            </span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-4">
        <h2 className="font-bold mb-2">بيانات التوصيل</h2>
        <p className="text-sm text-gray-600">📍 {order.city} {order.village ? `- ${order.village}` : ''} - {order.address}</p>
        <p className="text-sm text-gray-600">📞 {order.phone}</p>
        {order.notes && <p className="text-sm text-gray-600">📝 {order.notes}</p>}
      </div>

      {order.courier_name && (
        <div className="bg-white rounded-2xl border border-gray-100 p-4 mt-4">
          <h2 className="font-bold mb-2">المندوب 🛵</h2>
          <p className="text-sm text-gray-600">{order.courier_name} · {order.courier_phone}</p>
        </div>
      )}

      {order.status === 'delivered' && user?.id === order.user_id && (
        <ReviewSection orderId={order.id} review={order.review} onSubmitted={load} />
      )}

      {(order.status === 'delivered' || order.status === 'cancelled') && user?.id === order.user_id && (
        <button
          onClick={reorder}
          disabled={reordering}
          className="w-full mt-4 border border-primary-600 text-primary-600 hover:bg-primary-50 disabled:opacity-50 font-bold py-3 rounded-full"
        >
          {reordering ? 'جاري التحضير...' : '🔁 اطلب تاني'}
        </button>
      )}
    </div>
  );
}

function ReviewSection({ orderId, review, onSubmitted }) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function submit() {
    if (!rating) {
      setError('اختار تقييم بالنجوم الأول');
      return;
    }
    setError('');
    setSaving(true);
    try {
      await api.submitReview(orderId, { rating, comment });
      onSubmitted();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (review) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-4 mt-4">
        <h2 className="font-bold mb-2">تقييمك للطلب ✅</h2>
        <StarRating value={review.rating} readOnly size="text-xl" />
        {review.comment && <p className="text-sm text-gray-600 mt-2">{review.comment}</p>}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4 mt-4">
      <h2 className="font-bold mb-2">قيّم تجربتك مع المحل</h2>
      <StarRating value={rating} onChange={setRating} />
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="اكتب رأيك (اختياري)"
        rows={2}
        className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm mt-3"
      />
      {error && <p className="text-red-500 text-xs mt-2">{error}</p>}
      <button
        onClick={submit}
        disabled={saving}
        className="mt-3 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white text-sm font-semibold px-5 py-2 rounded-full"
      >
        {saving ? 'جاري الإرسال...' : 'إرسال التقييم'}
      </button>
    </div>
  );
}
