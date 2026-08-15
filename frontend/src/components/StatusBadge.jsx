const STATUS_MAP = {
  pending: { label: 'قيد المراجعة', color: 'bg-yellow-100 text-yellow-700' },
  accepted: { label: 'تم القبول', color: 'bg-blue-100 text-blue-700' },
  preparing: { label: 'جاري التجهيز', color: 'bg-indigo-100 text-indigo-700' },
  out_for_delivery: { label: 'في الطريق', color: 'bg-purple-100 text-purple-700' },
  delivered: { label: 'تم التوصيل', color: 'bg-green-100 text-green-700' },
  cancelled: { label: 'ملغي', color: 'bg-red-100 text-red-700' },
};

export default function StatusBadge({ status }) {
  const info = STATUS_MAP[status] || { label: status, color: 'bg-gray-100 text-gray-700' };
  return (
    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${info.color}`}>
      {info.label}
    </span>
  );
}

export { STATUS_MAP };
