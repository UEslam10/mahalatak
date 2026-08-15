import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../api';
import ProductCard from '../components/ProductCard';
import ImageOrEmoji from '../components/ImageOrEmoji';
import { useCart } from '../context/CartContext';

export default function Store() {
  const { id } = useParams();
  const [store, setStore] = useState(null);
  const [products, setProducts] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const cart = useCart();
  const navigate = useNavigate();

  useEffect(() => {
    setLoading(true);
    Promise.all([api.getStore(id), api.getStoreProducts(id), api.getStoreReviews(id)])
      .then(([storeRes, productsRes, reviewsRes]) => {
        setStore(storeRes.store);
        setProducts(productsRes.products);
        setReviews(reviewsRes.reviews);
      })
      .finally(() => setLoading(false));
  }, [id]);

  function getQty(productId) {
    if (cart.storeId !== Number(id)) return 0;
    return cart.items.find((i) => i.product_id === productId)?.quantity || 0;
  }

  function handleAdd(product) {
    cart.addItem(product, store);
  }

  if (loading) return <div className="text-center py-20 text-gray-400">جاري التحميل...</div>;
  if (!store) return <div className="text-center py-20 text-gray-400">المحل غير موجود</div>;

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 pb-28">
      <Link to="/" className="text-sm text-gray-500 hover:text-primary-600">← رجوع للرئيسية</Link>

      <div className="bg-white rounded-2xl border border-gray-100 p-5 mt-3 mb-6">
        <div className="flex items-start gap-4">
          <div className="w-20 h-20 rounded-2xl bg-primary-50 flex items-center justify-center text-4xl shrink-0 overflow-hidden">
            <ImageOrEmoji src={store.image} alt={store.name} className="w-full h-full object-cover" emojiClass="text-4xl" />
          </div>
          <div className="flex-1">
            <h1 className="text-xl font-extrabold">{store.name}</h1>
            <p className="text-sm text-gray-500 mb-1">{store.description}</p>
            <p className="text-xs text-gray-500">{store.category_icon} {store.category_name} · {store.city} {store.village ? `- ${store.village}` : ''}</p>
          </div>
        </div>
        <div className="flex items-center gap-4 mt-4 text-sm text-gray-600 border-t border-gray-100 pt-3">
          {store.rating_count > 0 ? (
            <span>⭐ {store.rating.toFixed(1)} ({store.rating_count} تقييم)</span>
          ) : (
            <span className="text-primary-600 font-semibold">✨ محل جديد</span>
          )}
          <span>🚚 توصيل {store.delivery_fee} ج.م</span>
          {store.min_order > 0 && <span>الحد الأدنى {store.min_order} ج.م</span>}
          {!store.is_open && <span className="text-red-500 font-bold">مغلق حاليًا</span>}
        </div>
      </div>

      <h2 className="text-lg font-extrabold mb-3">المنتجات</h2>
      <div className="space-y-2">
        {products.length === 0 ? (
          <p className="text-gray-400 py-10 text-center">لا توجد منتجات مضافة حاليًا</p>
        ) : (
          products.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              quantity={getQty(product.id)}
              onAdd={() => handleAdd(product)}
              onIncrease={() => cart.updateQuantity(product.id, getQty(product.id) + 1)}
              onDecrease={() => cart.updateQuantity(product.id, getQty(product.id) - 1)}
            />
          ))
        )}
      </div>

      {reviews.length > 0 && (
        <div className="mt-8">
          <h2 className="text-lg font-extrabold mb-3">تقييمات العملاء ({reviews.length})</h2>
          <div className="space-y-2">
            {reviews.map((r) => (
              <div key={r.id} className="bg-white rounded-2xl border border-gray-100 p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-sm">{r.customer_name}</span>
                  <span className="text-amber-500 text-sm">{'⭐'.repeat(r.rating)}</span>
                </div>
                {r.comment && <p className="text-sm text-gray-600">{r.comment}</p>}
                <p className="text-[11px] text-gray-400 mt-1">{new Date(r.created_at).toLocaleDateString('ar-EG')}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {cart.storeId === Number(id) && cart.items.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4">
          <div className="max-w-3xl mx-auto">
            <button
              onClick={() => navigate('/cart')}
              className="w-full bg-primary-600 hover:bg-primary-700 text-white font-bold py-3 rounded-full flex items-center justify-center gap-2"
            >
              <span>عرض العربة ({cart.itemsCount})</span>
              <span>·</span>
              <span>{cart.itemsTotal} ج.م</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
