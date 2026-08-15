import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';

export default function Cart() {
  const cart = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();

  function handleCheckout() {
    if (!user) {
      navigate('/login?redirect=/checkout');
      return;
    }
    navigate('/checkout');
  }

  if (cart.items.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <p className="text-5xl mb-4">🛒</p>
        <p className="text-gray-500 mb-6">عربتك فاضية دلوقتي</p>
        <Link to="/" className="bg-primary-600 hover:bg-primary-700 text-white font-bold px-6 py-3 rounded-full">
          تصفح المحلات
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 pb-32">
      <Link to={`/store/${cart.storeId}`} className="text-sm text-gray-500 hover:text-primary-600">← رجوع للمحل</Link>
      <h1 className="text-2xl font-extrabold mt-2 mb-1">عربتك</h1>
      <p className="text-sm text-gray-500 mb-6">من محل: {cart.storeName}</p>

      <div className="space-y-2 mb-6">
        {cart.items.map((item) => (
          <div key={item.product_id} className="flex items-center gap-3 bg-white rounded-2xl border border-gray-100 p-3">
            <div className="w-14 h-14 rounded-xl bg-primary-50 flex items-center justify-center text-2xl shrink-0">
              {item.image || '🛍️'}
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-bold text-sm line-clamp-1">{item.name}</h4>
              <p className="text-primary-600 font-extrabold text-sm">{item.price} ج.م</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => cart.updateQuantity(item.product_id, item.quantity - 1)}
                className="w-8 h-8 rounded-full bg-gray-100 text-gray-700 font-bold"
              >
                −
              </button>
              <span className="w-5 text-center font-bold">{item.quantity}</span>
              <button
                onClick={() => cart.updateQuantity(item.product_id, item.quantity + 1)}
                className="w-8 h-8 rounded-full bg-primary-600 text-white font-bold"
              >
                +
              </button>
            </div>
          </div>
        ))}
      </div>

      <button onClick={cart.clearCart} className="text-sm text-red-500 mb-6">🗑️ إفراغ العربة</button>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4">
        <div className="max-w-2xl mx-auto">
          <div className="flex justify-between text-sm text-gray-600 mb-1">
            <span>إجمالي المنتجات</span>
            <span>{cart.itemsTotal} ج.م</span>
          </div>
          <div className="flex justify-between font-bold mb-3">
            <span>الإجمالي (قبل التوصيل)</span>
            <span>{cart.itemsTotal} ج.م</span>
          </div>
          <button
            onClick={handleCheckout}
            className="w-full bg-primary-600 hover:bg-primary-700 text-white font-bold py-3 rounded-full"
          >
            متابعة الطلب
          </button>
        </div>
      </div>
    </div>
  );
}
