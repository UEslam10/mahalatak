import { useEffect, useState } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { api } from '../api';
import StoreCard from '../components/StoreCard';
import { useLocationCtx } from '../context/LocationContext';

export default function Category() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const categoryName = searchParams.get('name') || 'الفئة';
  const { city, village } = useLocationCtx();
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.getStores({ category_id: id, ...(city ? { city } : {}), ...(village ? { village } : {}) })
      .then(({ stores }) => setStores(stores))
      .finally(() => setLoading(false));
  }, [id, city, village]);

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <Link to="/" className="text-sm text-gray-500 hover:text-primary-600">← رجوع للرئيسية</Link>
      <h1 className="text-2xl font-extrabold mt-2 mb-6">{categoryName}</h1>

      {loading ? (
        <div className="text-center py-16 text-gray-400">جاري التحميل...</div>
      ) : stores.length === 0 ? (
        <p className="text-gray-400 py-16 text-center">لا توجد محلات في هذه الفئة بمنطقتك حاليًا</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {stores.map((store) => (
            <StoreCard key={store.id} store={store} />
          ))}
        </div>
      )}
    </div>
  );
}
