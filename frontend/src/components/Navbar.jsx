import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useLocationCtx } from '../context/LocationContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const { itemsCount } = useCart();
  const { city, village, openPicker } = useLocationCtx();
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-40 bg-white shadow-sm">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
        <Link to="/" className="flex items-center gap-2 shrink-0">
          <span className="text-2xl">🏘️</span>
          <span className="text-xl font-extrabold text-primary-600">محلاتك</span>
        </Link>

        <button
          onClick={openPicker}
          className="hidden sm:flex items-center gap-1 text-sm text-gray-600 hover:text-primary-600 border border-gray-200 rounded-full px-3 py-1.5"
        >
          📍 {city ? `${city}${village ? ' - ' + village : ''}` : 'اختر مكانك'}
        </button>

        <div className="flex items-center gap-2 sm:gap-4">
          {user?.role === 'vendor' && (
            <Link to="/vendor" className="text-sm font-semibold text-gray-700 hover:text-primary-600">
              لوحة التاجر
            </Link>
          )}
          {user?.role === 'delivery' && (
            <Link to="/delivery" className="text-sm font-semibold text-gray-700 hover:text-primary-600">
              لوحة المندوب
            </Link>
          )}
          {user?.role === 'admin' && (
            <Link to="/admin" className="text-sm font-semibold text-gray-700 hover:text-primary-600">
              لوحة الأدمن
            </Link>
          )}

          <Link to="/cart" className="relative text-2xl">
            🛒
            {itemsCount > 0 && (
              <span className="absolute -top-2 -left-2 bg-primary-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                {itemsCount}
              </span>
            )}
          </Link>

          {user ? (
            <div className="relative group">
              <button className="flex items-center gap-1 text-sm font-semibold text-gray-700">
                {user.name.split(' ')[0]} ▾
              </button>
              <div className="absolute left-0 mt-2 w-44 bg-white rounded-xl shadow-lg border border-gray-100 py-2 hidden group-hover:block">
                <Link to="/orders" className="block px-4 py-2 text-sm hover:bg-gray-50">طلباتي</Link>
                <Link to="/profile" className="block px-4 py-2 text-sm hover:bg-gray-50">الملف الشخصي</Link>
                {user.role === 'vendor' && (
                  <Link to="/vendor" className="block px-4 py-2 text-sm hover:bg-gray-50">لوحة التاجر</Link>
                )}
                {user.role === 'delivery' && (
                  <Link to="/delivery" className="block px-4 py-2 text-sm hover:bg-gray-50">لوحة المندوب</Link>
                )}
                {user.role === 'admin' && (
                  <Link to="/admin" className="block px-4 py-2 text-sm hover:bg-gray-50">لوحة الأدمن</Link>
                )}
                <button
                  onClick={() => { logout(); navigate('/'); }}
                  className="w-full text-right block px-4 py-2 text-sm text-red-600 hover:bg-gray-50"
                >
                  تسجيل الخروج
                </button>
              </div>
            </div>
          ) : (
            <Link
              to="/login"
              className="bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold px-4 py-2 rounded-full"
            >
              تسجيل الدخول
            </Link>
          )}
        </div>
      </div>

      <button
        onClick={openPicker}
        className="sm:hidden w-full flex items-center justify-center gap-1 text-xs text-gray-600 border-t border-gray-100 py-1.5"
      >
        📍 {city ? `${city}${village ? ' - ' + village : ''}` : 'اختر مكانك'}
      </button>
    </header>
  );
}
