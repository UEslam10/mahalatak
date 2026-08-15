import { Link } from 'react-router-dom';
import ImageOrEmoji from './ImageOrEmoji';

export default function StoreCard({ store }) {
  return (
    <Link
      to={`/store/${store.id}`}
      className={`block bg-white rounded-2xl shadow-sm hover:shadow-md transition overflow-hidden border border-gray-100 ${!store.is_open ? 'opacity-60' : ''}`}
    >
      <div className="h-28 bg-gradient-to-br from-primary-100 to-primary-50 flex items-center justify-center text-5xl overflow-hidden">
        <ImageOrEmoji src={store.image} alt={store.name} className="w-full h-full object-cover" emojiClass="text-5xl" />
      </div>
      <div className="p-3">
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-bold text-gray-800 line-clamp-1">{store.name}</h3>
          {store.rating_count > 0 ? (
            <span className="text-xs font-semibold text-amber-500 shrink-0">⭐ {store.rating?.toFixed?.(1) ?? store.rating} ({store.rating_count})</span>
          ) : (
            <span className="text-xs font-semibold text-primary-500 shrink-0">✨ جديد</span>
          )}
        </div>
        {store.description && (
          <p className="text-xs text-gray-500 line-clamp-1 mb-2">{store.description}</p>
        )}
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>{store.category_icon} {store.category_name}</span>
          {!store.is_open ? (
            <span className="text-red-500 font-semibold">مغلق حاليًا</span>
          ) : (
            <span>توصيل {store.delivery_fee} ج</span>
          )}
        </div>
      </div>
    </Link>
  );
}
