import ImageOrEmoji from './ImageOrEmoji';

export default function ProductCard({ product, quantity, onAdd, onIncrease, onDecrease }) {
  return (
    <div className="flex items-center gap-3 bg-white rounded-2xl border border-gray-100 p-3">
      <div className="w-16 h-16 rounded-xl bg-primary-50 flex items-center justify-center text-3xl shrink-0 overflow-hidden">
        <ImageOrEmoji src={product.image} alt={product.name} className="w-full h-full object-cover" emojiClass="text-3xl" fallback="🛍️" />
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="font-bold text-gray-800 text-sm line-clamp-1">{product.name}</h4>
        {product.description && (
          <p className="text-xs text-gray-500 line-clamp-1">{product.description}</p>
        )}
        <p className="text-primary-600 font-extrabold mt-1">{product.price} ج.م</p>
      </div>

      {!product.is_available ? (
        <span className="text-xs text-red-500 font-semibold shrink-0">غير متاح</span>
      ) : quantity > 0 ? (
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onDecrease}
            className="w-8 h-8 rounded-full bg-primary-100 text-primary-700 font-bold flex items-center justify-center"
          >
            −
          </button>
          <span className="w-5 text-center font-bold">{quantity}</span>
          <button
            onClick={onIncrease}
            className="w-8 h-8 rounded-full bg-primary-600 text-white font-bold flex items-center justify-center"
          >
            +
          </button>
        </div>
      ) : (
        <button
          onClick={onAdd}
          className="shrink-0 bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold px-4 py-2 rounded-full"
        >
          أضف
        </button>
      )}
    </div>
  );
}
