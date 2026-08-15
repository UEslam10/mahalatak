import { useEffect, useState } from 'react';
import { api } from '../api';

export default function ContactUs() {
  const [info, setInfo] = useState(null);

  useEffect(() => {
    api.getPublicSettings().then(setInfo).catch(() => {});
  }, []);

  const hasContactInfo = info && (info.supportPhone || info.supportEmail);

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-extrabold mb-2">تواصل معنا</h1>
      <p className="text-gray-500 mb-8">عندك سؤال أو مشكلة أو اقتراح؟ إحنا هنا نساعدك.</p>

      {hasContactInfo ? (
        <div className="space-y-3">
          {info.supportPhone && (
            <a
              href={`tel:${info.supportPhone}`}
              className="flex items-center gap-3 bg-white border border-gray-100 rounded-2xl p-4 hover:shadow-sm"
            >
              <span className="text-2xl">📞</span>
              <div>
                <p className="font-bold text-sm">اتصل بينا</p>
                <p className="text-gray-500 text-sm" dir="ltr">{info.supportPhone}</p>
              </div>
            </a>
          )}
          {info.supportEmail && (
            <a
              href={`mailto:${info.supportEmail}`}
              className="flex items-center gap-3 bg-white border border-gray-100 rounded-2xl p-4 hover:shadow-sm"
            >
              <span className="text-2xl">📧</span>
              <div>
                <p className="font-bold text-sm">ابعتلنا إيميل</p>
                <p className="text-gray-500 text-sm" dir="ltr">{info.supportEmail}</p>
              </div>
            </a>
          )}
        </div>
      ) : (
        <p className="text-gray-400">بيانات التواصل هتضاف قريبًا.</p>
      )}

      <div className="mt-10 bg-gray-50 rounded-2xl p-4 text-sm text-gray-500">
        لو عندك مشكلة في طلب معين، أسرع حل إنك تكلم المحل مباشرة من صفحة تفاصيل الطلب، أو تتواصل مع الإدارة
        بالبيانات اللي فوق لو المشكلة مستمرة.
      </div>
    </div>
  );
}
