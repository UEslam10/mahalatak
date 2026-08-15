import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api';

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1); // 1: رقم الموبايل، 2: الإجابة وكلمة السر الجديدة
  const [phone, setPhone] = useState('');
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handlePhoneSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.getForgotPasswordQuestion(phone);
      setQuestion(res.question);
      setStep(2);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleResetSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.resetForgotPassword({ phone, answer, newPassword });
      setDone(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className="max-w-sm mx-auto px-4 py-16 text-center">
        <div className="text-5xl mb-4">✅</div>
        <h1 className="text-xl font-extrabold mb-2">تم تغيير كلمة السر</h1>
        <p className="text-sm text-gray-500 mb-8">تقدر تسجل دخول دلوقتي بكلمة السر الجديدة</p>
        <button
          onClick={() => navigate('/login')}
          className="w-full bg-primary-600 hover:bg-primary-700 text-white font-bold py-2.5 rounded-full"
        >
          تسجيل الدخول
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-sm mx-auto px-4 py-16">
      <h1 className="text-2xl font-extrabold mb-1 text-center">استرجاع كلمة السر</h1>
      <p className="text-sm text-gray-500 text-center mb-8">
        {step === 1 ? 'اكتب رقم موبايلك المسجل به حسابك' : 'جاوب على سؤال الأمان بتاعك'}
      </p>

      {step === 1 ? (
        <form onSubmit={handlePhoneSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold mb-1">رقم الموبايل</label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full border border-gray-300 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary-500"
              required
            />
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button
            disabled={loading}
            className="w-full bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white font-bold py-2.5 rounded-full"
          >
            {loading ? 'جاري التحقق...' : 'التالي'}
          </button>
        </form>
      ) : (
        <form onSubmit={handleResetSubmit} className="space-y-4">
          <div className="bg-gray-50 rounded-xl p-3 text-sm font-semibold text-center">{question}</div>
          <div>
            <label className="block text-sm font-semibold mb-1">إجابتك</label>
            <input
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              className="w-full border border-gray-300 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">كلمة السر الجديدة</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full border border-gray-300 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary-500"
              required
            />
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button
            disabled={loading}
            className="w-full bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white font-bold py-2.5 rounded-full"
          >
            {loading ? 'جاري التغيير...' : 'تغيير كلمة السر'}
          </button>
          <button
            type="button"
            onClick={() => setStep(1)}
            className="w-full text-gray-500 text-sm font-semibold py-1"
          >
            رجوع
          </button>
        </form>
      )}

      <p className="text-center text-sm text-gray-500 mt-6">
        فاكر كلمة السر؟{' '}
        <Link to="/login" className="text-primary-600 font-semibold">سجل دخول</Link>
      </p>
    </div>
  );
}
