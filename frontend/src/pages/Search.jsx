import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { api } from '../api';
import StoreCard from '../components/StoreCard';
import ImageOrEmoji from '../components/ImageOrEmoji';
import { useLocationCtx } from '../context/LocationContext';

export default function Search() {
  const [searchParams] = useSearchParams();
  const q = searchParams.get('q') || '';
  const { city } = useLocationCtx();
  const [stores, setStores] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!q) return;
    setLoading(true);
    Promise.all([
      api.getStores({ q, ...(city ? { city } : {}) }),
      api.searchProducts({ q, ...(city ? { city } : {}) }),
    ])
      .then(([storesRes, productsRes]) => {
        setStores(storesRes.stores);
        setProducts(productsRes.products);
      })
      .finally(() => setLoading(false));
  }, [q, city]);

  const noResults = stores.length === 0 && products.length === 0;

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <Link to="/" className="text-sm text-gray-500 hover:text-primary-600">← رجوع للرئيسية</Link>
      <h1 className="text-2xl font-extrabold mt-2 mb-6">نتائج البحث عن "{q}"</h1>

      {loading ? (
        <div className="text-center py-16 text-gray-400">جاري البحث...</div>
      ) : noResults ? (
        <p className="text-gray-400 py-16 text-center">مفيش نتائج مطابقة</p>
      ) : (
        <>
          {stores.length > 0 && (
            <div className="mb-8">
              <h2 className="text-lg font-bold mb-3">محلات ({stores.length})</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {stores.map((store) => (
                  <StoreCard key={store.id} store={store} />
                ))}
              </div>
            </div>
          )}

          {products.length > 0 && (
            <div>
              <h2 className="text-lg font-bold mb-3">منتجات ({products.length})</h2>
              <div className="space-y-2">
                {products.map((product) => (
                  <Link
                    key={product.id}
                    to={`/store/${product.store_id}`}
                    className={`flex items-center gap-3 bg-white rounded-2xl border border-gray-100 p-3 hover:shadow-sm ${!product.is_open ? 'opacity-60' : ''}`}
                  >
                    <span className="w-14 h-14 rounded-xl bg-primary-50 flex items-center justify-center text-2xl overflow-hidden shrink-0">
                      <ImageOrEmoji src={product.image} alt={product.name} className="w-full h-full object-cover" emojiClass="text-2xl" fallback="🛍️" />
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">{product.name}</p>
                      <p className="text-xs text-gray-500">من {product.store_name} · {product.city}{product.village ? ` - ${product.village}` : ''}</p>
                      {!product.is_open && <p className="text-xs text-red-500 font-semibold">المحل مغلق حاليًا</p>}
                    </div>
                    <span className="font-bold text-sm shrink-0">{product.price} ج.م</span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
