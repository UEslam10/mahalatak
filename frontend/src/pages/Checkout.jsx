import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useLocationCtx } from '../context/LocationContext';

export default function Checkout() {
  const cart = useCart();
  const { user } = useAuth();
  const { city: defaultCity, village: defaultVillage } = useLocationCtx();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    city: defaultCity || user?.city || '',
    village: defaultVillage || user?.village || '',
    address: user?.address || '',
    phone: user?.phone || '',
    notes: '',
    payment_method: 'cash',
    payment_reference: '',
  });
  const [confirmedTransfer, setConfirmedTransfer] = useState(false);
  const [paymentInfo, setPaymentInfo] = useState(null);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.getPublicSettings().then(setPaymentInfo).catch(() => {});
  }, []);

  if (cart.items.length === 0) {
    navigate('/cart');
    return null;
  }

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  const hasAnyWalletNumber = paymentInfo && (paymentInfo.vodafoneCashNumber || paymentInfo.instapayHandle);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!form.city || !form.address || !form.phone) {
      setError('من فضلك أكمل بيانات التوصيل');
      return;
    }
    if (form.payment_method === 'e_wallet') {
      if (!form.payment_reference.trim()) {
        setError('اكتب رقم أو مرجع التحويل اللي حولت بيه');
        return;
      }
      if (!confirmedTransfer) {
        setError('لازم تأكد إنك حولت المبلغ الأول');
        return;
      }
    }
    setSubmitting(true);
    try {
      const { order } = await api.createOrder({
        store_id: cart.storeId,
        items: cart.items.map((i) => ({ product_id: i.product_id, quantity: i.quantity })),
        city: form.city,
        village: form.village,
        address: form.address,
        phone: form.phone,
        notes: form.notes,
        payment_method: form.payment_method,
        payment_reference: form.payment_method === 'e_wallet' ? form.payment_reference : undefined,
      });
      cart.clearCart();
      navigate(`/orders/${order.id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-extrabold mb-6">إتمام الطلب</h1>

      <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-6">
        <h2 className="font-bold mb-2">ملخص الطلب من {cart.storeName}</h2>
        {cart.items.map((item) => (
          <div key={item.product_id} className="flex justify-between text-sm text-gray-600 py-1">
            <span>{item.name} × {item.quantity}</span>
            <span>{item.price * item.quantity} ج.م</span>
          </div>
        ))}
        <div className="flex justify-between font-bold pt-2 mt-2 border-t border-gray-100">
          <span>الإجمالي (قبل التوصيل)</span>
          <span>{cart.itemsTotal} ج.م</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-100 p-4 space-y-4">
        <h2 className="font-bold mb-1">بيانات التوصيل</h2>

        <div>
          <label className="block text-sm font-semibold mb-1">المدينة *</label>
          <input
            value={form.city}
            onChange={(e) => update('city', e.target.value)}
            className="w-full border border-gray-300 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-semibold mb-1">القرية / الحي</label>
          <input
            value={form.village}
            onChange={(e) => update('village', e.target.value)}
            className="w-full border border-gray-300 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold mb-1">العنوان بالتفصيل *</label>
          <textarea
            value={form.address}
            onChange={(e) => update('address', e.target.value)}
            rows={2}
            placeholder="اسم الشارع، رقم المنزل، علامة مميزة..."
            className="w-full border border-gray-300 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-semibold mb-1">رقم الموبايل *</label>
          <input
            value={form.phone}
            onChange={(e) => update('phone', e.target.value)}
            className="w-full border border-gray-300 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-semibold mb-1">ملاحظات (اختياري)</label>
          <textarea
            value={form.notes}
            onChange={(e) => update('notes', e.target.value)}
            rows={2}
            className="w-full border border-gray-300 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>

        <div className="border-t border-gray-100 pt-4">
          <label className="block text-sm font-semibold mb-2">طريقة الدفع</label>
          <div className="grid grid-cols-2 gap-2 mb-3">
            <button
              type="button"
              onClick={() => update('payment_method', 'cash')}
              className={`py-2.5 rounded-xl font-semibold text-sm border ${form.payment_method === 'cash' ? 'bg-primary-600 text-white border-primary-600' : 'border-gray-300 text-gray-600'}`}
            >
              كاش عند الاستلام 💵
            </button>
            <button
              type="button"
              onClick={() => update('payment_method', 'e_wallet')}
              disabled={!hasAnyWalletNumber}
              className={`py-2.5 rounded-xl font-semibold text-sm border disabled:opacity-40 disabled:cursor-not-allowed ${form.payment_method === 'e_wallet' ? 'bg-primary-600 text-white border-primary-600' : 'border-gray-300 text-gray-600'}`}
            >
              محفظة إلكترونية 📱
            </button>
          </div>

          {form.payment_method === 'e_wallet' && (
            <div className="bg-gray-50 rounded-xl p-3 space-y-3">
              <p className="text-sm font-semibold">حوّل مبلغ {cart.itemsTotal} ج.م (+ رسوم التوصيل) على:</p>
              {paymentInfo?.vodafoneCashNumber && (
                <p className="text-sm">📱 فودافون كاش: <span className="font-bold" dir="ltr">{paymentInfo.vodafoneCashNumber}</span></p>
              )}
              {paymentInfo?.instapayHandle && (
                <p className="text-sm">🔗 إنستاباي: <span className="font-bold">{paymentInfo.instapayHandle}</span></p>
              )}

              <div>
                <label className="block text-xs font-semibold mb-1">رقم/مرجع التحويل *</label>
                <input
                  value={form.payment_reference}
                  onChange={(e) => update('payment_reference', e.target.value)}
                  placeholder="مثلاً: آخر 4 أرقام حولت منها، أو رقم العملية"
                  className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={confirmedTransfer}
                  onChange={(e) => setConfirmedTransfer(e.target.checked)}
                  className="w-4 h-4"
                />
                أكدت إني حولت المبلغ فعلًا
              </label>

              <p className="text-[11px] text-gray-400">
                هيتم تأكيد استلام التحويل من المحل، وممكن ياخد وقت بسيط. ممكن كمان تدفع كاش عند الاستلام لو حصلت أي مشكلة.
              </p>
            </div>
          )}
        </div>

        {error && <p className="text-red-500 text-sm">{error}</p>}

        <button
          disabled={submitting}
          className="w-full bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white font-bold py-3 rounded-full"
        >
          {submitting ? 'جاري إرسال الطلب...' : form.payment_method === 'e_wallet' ? 'تأكيد الطلب (دفع إلكتروني)' : 'تأكيد الطلب (الدفع عند الاستلام)'}
        </button>
      </form>
    </div>
  );
}
