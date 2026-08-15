import { useState } from 'react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';

const ROLE_LABELS = {
  customer: 'عميل 🙋', vendor: 'صاحب محل 🏪', delivery: 'مندوب توصيل 🛵', admin: 'أدمن 🛠️',
};

export default function Profile() {
  const { user, refreshUser } = useAuth();
  const [form, setForm] = useState({
    name: user?.name || '', city: user?.city || '', village: user?.village || '', address: user?.address || '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [pwSaving, setPwSaving] = useState(false);
  const [pwError, setPwError] = useState('');
  const [pwSaved, setPwSaved] = useState(false);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function saveProfile(e) {
    e.preventDefault();
    setError('');
    setSaved(false);
    setSaving(true);
    try {
      await api.updateProfile(form);
      await refreshUser();
      setSaved(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function savePassword(e) {
    e.preventDefault();
    setPwError('');
    setPwSaved(false);
    if (pwForm.newPassword !== pwForm.confirmPassword) {
      setPwError('كلمة السر الجديدة وتأكيدها مش متطابقين');
      return;
    }
    setPwSaving(true);
    try {
      await api.changePassword({ currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword });
      setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setPwSaved(true);
    } catch (err) {
      setPwError(err.message);
    } finally {
      setPwSaving(false);
    }
  }

  if (!user) return null;

  return (
    <div className="max-w-sm mx-auto px-4 py-8">
      <h1 className="text-2xl font-extrabold mb-1">الملف الشخصي</h1>
      <p className="text-sm text-gray-500 mb-8">{ROLE_LABELS[user.role]} · {user.phone}</p>

      <form onSubmit={saveProfile} className="space-y-4 mb-10">
        <h2 className="font-bold text-sm text-gray-700">بياناتك</h2>

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

        <p className="text-xs text-gray-400">رقم الموبايل ({user.phone}) ونوع الحساب مينفعش يتغيروا من هنا.</p>

        {error && <p className="text-red-500 text-sm">{error}</p>}
        {saved && <p className="text-green-600 text-sm">تم الحفظ ✅</p>}

        <button
          disabled={saving}
          className="w-full bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white font-bold py-2.5 rounded-full"
        >
          {saving ? 'جاري الحفظ...' : 'حفظ التعديلات'}
        </button>
      </form>

      <form onSubmit={savePassword} className="space-y-4 border-t border-gray-100 pt-6">
        <h2 className="font-bold text-sm text-gray-700">تغيير كلمة السر</h2>

        <div>
          <label className="block text-sm font-semibold mb-1">كلمة السر الحالية</label>
          <input
            type="password"
            value={pwForm.currentPassword}
            onChange={(e) => setPwForm((f) => ({ ...f, currentPassword: e.target.value }))}
            className="w-full border border-gray-300 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary-500"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-semibold mb-1">كلمة السر الجديدة</label>
          <input
            type="password"
            value={pwForm.newPassword}
            onChange={(e) => setPwForm((f) => ({ ...f, newPassword: e.target.value }))}
            className="w-full border border-gray-300 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary-500"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-semibold mb-1">تأكيد كلمة السر الجديدة</label>
          <input
            type="password"
            value={pwForm.confirmPassword}
            onChange={(e) => setPwForm((f) => ({ ...f, confirmPassword: e.target.value }))}
            className="w-full border border-gray-300 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary-500"
            required
          />
        </div>

        {pwError && <p className="text-red-500 text-sm">{pwError}</p>}
        {pwSaved && <p className="text-green-600 text-sm">اتغيرت كلمة السر ✅</p>}

        <button
          disabled={pwSaving}
          className="w-full border border-primary-600 text-primary-600 hover:bg-primary-50 disabled:opacity-50 font-bold py-2.5 rounded-full"
        >
          {pwSaving ? 'جاري التغيير...' : 'تغيير كلمة السر'}
        </button>
      </form>
    </div>
  );
}
