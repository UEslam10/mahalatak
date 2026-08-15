export default function StarRating({ value = 0, onChange, size = 'text-2xl', readOnly = false }) {
  const stars = [1, 2, 3, 4, 5];

  return (
    <div className="flex gap-1" dir="ltr">
      {stars.map((n) => (
        <button
          key={n}
          type="button"
          disabled={readOnly}
          onClick={() => onChange && onChange(n)}
          className={`${size} ${readOnly ? 'cursor-default' : 'cursor-pointer'} leading-none`}
        >
          {n <= value ? '⭐' : '☆'}
        </button>
      ))}
    </div>
  );
}
