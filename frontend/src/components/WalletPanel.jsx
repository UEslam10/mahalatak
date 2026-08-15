import { useEffect, useState } from 'react';
import { api } from '../api';

const TYPE_LABELS = {
  order_earning: { label: 'أرباح طلب', color: 'text-green-600' },
  cash_collected: { label: 'كاش محصّل (مستحق للمنصة)', color: 'text-red-500' },
  settlement: { label: 'تسوية من الإدارة', color: 'text-blue-600' },
  adjustment: { label: 'تعديل', color: 'text-gray-600' },
};

export default function WalletPanel({ role }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getMyWallet().then(setData).finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-gray-400 text-center py-10">جاري التحميل...</p>;
  if (!data) return null;

  const isDelivery = role === 'delivery';
  const balancePositive = data.balance >= 0;

  return (
    <div>
      <div className={`rounded-2xl p-5 mb-6 ${balancePositive ? 'bg-green-50 border border-green-100' : 'bg-red-50 border border-red-100'}`}>
        <p className="text-sm text-gray-600 mb-1">
          {balancePositive
            ? (isDelivery ? 'رصيدك الحالي (لو موجب فده نادر لمندوب، عادة بيبقى دين للمنصة)' : 'رصيدك المستحق من المنصة')
            : (isDelivery ? 'المبلغ المستحق عليك تسليمه للمنصة' : 'عليك مبلغ للمنصة')}
        </p>
        <p className={`text-3xl font-extrabold ${balancePositive ? 'text-green-700' : 'text-red-600'}`}>
          {Math.abs(data.balance).toFixed(2)} ج.م
          <span className="text-sm font-semibold mr-2">{balancePositive ? '(لك)' : '(عليك)'}</span>
        </p>
        {isDelivery && (
          <p className="text-xs text-gray-500 mt-2">
            كل طلب بتسلمه: بتحصّل إجمالي الطلب كامل (قيمة المنتجات + رسوم التوصيل) كاش من العميل وتسلّمه للمنصة، وهي بدورها بتدّيك صافي أجرة التوصيل بعد خصم عمولتها. لحد ما تسلّم الكاش، المبلغ بيفضل مسجل عليك كدين.
          </p>
        )}
      </div>

      <h3 className="font-bold mb-3">سجل الحركات</h3>
      {data.transactions.length === 0 ? (
        <p className="text-gray-400 text-center py-10">لا توجد حركات بعد</p>
      ) : (
        <div className="space-y-2">
          {data.transactions.map((t) => {
            const info = TYPE_LABELS[t.type] || { label: t.type, color: 'text-gray-600' };
            return (
              <div key={t.id} className="bg-white border border-gray-100 rounded-xl p-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold">{info.label}</p>
                  {t.description && <p className="text-xs text-gray-500">{t.description}</p>}
                  <p className="text-[11px] text-gray-400 mt-0.5">{new Date(t.created_at).toLocaleString('ar-EG')}</p>
                </div>
                <div className="text-left shrink-0">
                  <p className={`font-bold ${t.amount >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                    {t.amount >= 0 ? '+' : ''}{t.amount.toFixed(2)}
                  </p>
                  <p className="text-[11px] text-gray-400">الرصيد بعدها: {t.balance_after.toFixed(2)}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
