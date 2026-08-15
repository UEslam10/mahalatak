import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirect = searchParams.get('redirect') || '/';

  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(phone, password);
      navigate(redirect);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-sm mx-auto px-4 py-16">
      <h1 className="text-2xl font-extrabold mb-1 text-center">تسجيل الدخول</h1>
      <p className="text-sm text-gray-500 text-center mb-8">اهلاً بيك تاني في محلاتك</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-semibold mb-1">رقم الموبايل</label>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full border border-gray-300 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary-500"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-semibold mb-1">كلمة السر</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border border-gray-300 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary-500"
            required
          />
        </div>

        {error && <p className="text-red-500 text-sm">{error}</p>}

        <div className="text-left">
          <Link to="/forgot-password" className="text-xs text-gray-500 hover:text-primary-600">نسيت كلمة السر؟</Link>
        </div>

        <button
          disabled={loading}
          className="w-full bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white font-bold py-2.5 rounded-full"
        >
          {loading ? 'جاري الدخول...' : 'دخول'}
        </button>
      </form>

      <p className="text-center text-sm text-gray-500 mt-6">
        مالكش حساب؟{' '}
        <Link to="/register" className="text-primary-600 font-semibold">سجل دلوقتي</Link>
      </p>

      <div className="mt-8 bg-gray-50 rounded-xl p-3 text-xs text-gray-500 text-center">
        بيانات تجريبية: 01000000001 / 123456 (عميل)<br />
        01000000002 / 123456 (تاجر)
      </div>
    </div>
  );
}
