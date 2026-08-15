import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api';
import StoreCard from '../components/StoreCard';
import { useLocationCtx } from '../context/LocationContext';

export default function Home() {
  const { city, village } = useLocationCtx();
  const [categories, setCategories] = useState([]);
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    if (!city) return;
    setLoading(true);
    Promise.all([
      api.getCategories(city),
      api.getStores({ city, ...(village ? { village } : {}) }),
    ])
      .then(([catRes, storeRes]) => {
        setCategories(catRes.categories);
        setStores(storeRes.stores);
      })
      .finally(() => setLoading(false));
  }, [city, village]);

  function handleSearch(e) {
    e.preventDefault();
    if (search.trim()) navigate(`/search?q=${encodeURIComponent(search.trim())}`);
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      {/* Hero */}
      <div className="bg-gradient-to-l from-primary-600 to-primary-500 rounded-3xl p-6 sm:p-10 text-white mb-8">
        <h1 className="text-2xl sm:text-3xl font-extrabold mb-2">كل محلات مدينتك وقريتك في مكان واحد 🏘️</h1>
        <p className="text-primary-50 mb-5">مطاعم، سوبر ماركت، صيدليات، ملابس، إلكترونيات وكل حاجة تانية — تطلب وتوصلك</p>
        <form onSubmit={handleSearch} className="flex gap-2">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="دور على محل أو منتج..."
            className="flex-1 rounded-full px-5 py-3 text-gray-800 focus:outline-none"
          />
          <button className="bg-white text-primary-600 font-bold px-6 py-3 rounded-full">بحث</button>
        </form>
      </div>

      {!city ? (
        <div className="text-center py-16 text-gray-400">اختر مكانك الأول عشان نوريك المحلات المتاحة</div>
      ) : loading ? (
        <div className="text-center py-16 text-gray-400">جاري التحميل...</div>
      ) : (
        <>
          {/* الفئات */}
          <section className="mb-10">
            <h2 className="text-lg font-extrabold mb-4">تسوق حسب الفئة</h2>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-7 gap-3">
              {categories.map((cat) => (
                <Link
                  key={cat.id}
                  to={`/category/${cat.id}?name=${encodeURIComponent(cat.name)}`}
                  className="flex flex-col items-center gap-1 bg-white rounded-2xl p-3 border border-gray-100 hover:border-primary-300 hover:shadow-sm transition"
                >
                  <span className="text-3xl">{cat.icon}</span>
                  <span className="text-xs font-semibold text-gray-700 text-center line-clamp-2">{cat.name}</span>
                  <span className="text-[10px] text-gray-400">{cat.stores_count} محل</span>
                </Link>
              ))}
            </div>
          </section>

          {/* كل المحلات */}
          <section>
            <h2 className="text-lg font-extrabold mb-4">
              محلات {village ? `${village}` : city} ({stores.length})
            </h2>
            {stores.length === 0 ? (
              <p className="text-gray-400 py-10 text-center">لسه مفيش محلات مسجلة في منطقتك، جرب توسّع الاختيار من زر الموقع 📍</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {stores.map((store) => (
                  <StoreCard key={store.id} store={store} />
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
