import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const SECURITY_QUESTIONS = [
  'ما اسم مدرستك الابتدائية؟',
  'ما اسم أول شارع سكنت فيه؟',
  'ما اسم حيوانك الأليف الأول؟',
  'ما هو لقب والدتك قبل الزواج؟',
  'ما هي مدينة ميلادك؟',
];

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: '', phone: '', password: '', role: 'customer', city: '', village: '', address: '',
    security_question: SECURITY_QUESTIONS[0], security_answer: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await register(form);
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-sm mx-auto px-4 py-12">
      <h1 className="text-2xl font-extrabold mb-1 text-center">إنشاء حساب جديد</h1>
      <p className="text-sm text-gray-500 text-center mb-8">انضم لمحلاتك دلوقتي</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-semibold mb-1">الاسم بالكامل</label>
          <input
            value={form.name}
            onChange={(e) => update('name', e.target.value)}
            className="w-full border border-gray-300 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-semibold mb-1">رقم الموبايل</label>
          <input
            value={form.phone}
            onChange={(e) => update('phone', e.target.value)}
            className="w-full border border-gray-300 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-semibold mb-1">كلمة السر</label>
          <input
            type="password"
            value={form.password}
            onChange={(e) => update('password', e.target.value)}
            className="w-full border border-gray-300 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-semibold mb-2">نوع الحساب</label>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => update('role', 'customer')}
              className={`py-2.5 rounded-xl font-semibold text-xs sm:text-sm border ${form.role === 'customer' ? 'bg-primary-600 text-white border-primary-600' : 'border-gray-300 text-gray-600'}`}
            >
              عميل 🙋
            </button>
            <button
              type="button"
              onClick={() => update('role', 'vendor')}
              className={`py-2.5 rounded-xl font-semibold text-xs sm:text-sm border ${form.role === 'vendor' ? 'bg-primary-600 text-white border-primary-600' : 'border-gray-300 text-gray-600'}`}
            >
              صاحب محل 🏪
            </button>
            <button
              type="button"
              onClick={() => update('role', 'delivery')}
              className={`py-2.5 rounded-xl font-semibold text-xs sm:text-sm border ${form.role === 'delivery' ? 'bg-primary-600 text-white border-primary-600' : 'border-gray-300 text-gray-600'}`}
            >
              مندوب توصيل 🛵
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold mb-1">المدينة</label>
          <input
            value={form.city}
            onChange={(e) => update('city', e.target.value)}
            className="w-full border border-gray-300 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold mb-1">القرية / الحي</label>
          <input
            value={form.village}
            onChange={(e) => update('village', e.target.value)}
            className="w-full border border-gray-300 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold mb-1">العنوان</label>
          <input
            value={form.address}
            onChange={(e) => update('address', e.target.value)}
            className="w-full border border-gray-300 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>

        <div className="border-t border-gray-100 pt-4">
          <p className="text-xs text-gray-500 mb-3">سؤال أمان بيساعدك تسترجع حسابك لو نسيت كلمة السر</p>
          <label className="block text-sm font-semibold mb-1">سؤال الأمان</label>
          <select
            value={form.security_question}
            onChange={(e) => update('security_question', e.target.value)}
            className="w-full border border-gray-300 rounded-xl px-3 py-2.5 mb-3 focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            {SECURITY_QUESTIONS.map((q) => <option key={q} value={q}>{q}</option>)}
          </select>
          <label className="block text-sm font-semibold mb-1">إجابتك</label>
          <input
            value={form.security_answer}
            onChange={(e) => update('security_answer', e.target.value)}
            className="w-full border border-gray-300 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary-500"
            required
          />
        </div>

        {error && <p className="text-red-500 text-sm">{error}</p>}

        <button
          disabled={loading}
          className="w-full bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white font-bold py-2.5 rounded-full"
        >
          {loading ? 'جاري إنشاء الحساب...' : 'إنشاء الحساب'}
        </button>
      </form>

      <p className="text-center text-sm text-gray-500 mt-6">
        عندك حساب بالفعل؟{' '}
        <Link to="/login" className="text-primary-600 font-semibold">سجل دخول</Link>
      </p>
    </div>
  );
}
