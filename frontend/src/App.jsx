import { Routes, Route, Link } from 'react-router-dom';
import { LocationProvider } from './context/LocationContext';
import Navbar from './components/Navbar';
import LocationPicker from './components/LocationPicker';
import ProtectedRoute from './components/ProtectedRoute';

import Home from './pages/Home';
import Category from './pages/Category';
import Search from './pages/Search';
import Store from './pages/Store';
import Cart from './pages/Cart';
import Checkout from './pages/Checkout';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import Profile from './pages/Profile';
import Orders from './pages/Orders';
import OrderDetail from './pages/OrderDetail';
import VendorDashboard from './pages/VendorDashboard';
import DeliveryDashboard from './pages/DeliveryDashboard';
import AdminDashboard from './pages/AdminDashboard';
import AboutUs from './pages/AboutUs';
import PrivacyPolicy from './pages/PrivacyPolicy';
import Terms from './pages/Terms';
import ContactUs from './pages/ContactUs';

export default function App() {
  return (
    <LocationProvider>
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <LocationPicker />
        <main className="flex-1">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/category/:id" element={<Category />} />
            <Route path="/search" element={<Search />} />
            <Route path="/store/:id" element={<Store />} />
            <Route path="/cart" element={<Cart />} />
            <Route
              path="/checkout"
              element={
                <ProtectedRoute>
                  <Checkout />
                </ProtectedRoute>
              }
            />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              }
            />
            <Route
              path="/orders"
              element={
                <ProtectedRoute>
                  <Orders />
                </ProtectedRoute>
              }
            />
            <Route
              path="/orders/:id"
              element={
                <ProtectedRoute>
                  <OrderDetail />
                </ProtectedRoute>
              }
            />
            <Route
              path="/vendor"
              element={
                <ProtectedRoute role="vendor">
                  <VendorDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/delivery"
              element={
                <ProtectedRoute role="delivery">
                  <DeliveryDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin"
              element={
                <ProtectedRoute role="admin">
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />
            <Route path="/about" element={<AboutUs />} />
            <Route path="/privacy" element={<PrivacyPolicy />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/contact" element={<ContactUs />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </main>
        <footer className="border-t border-gray-100 mt-10">
          <div className="max-w-6xl mx-auto px-4 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs text-gray-400">محلاتك © {new Date().getFullYear()} — كل مدينة وقرية تستاهل توصيل</p>
            <nav className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-gray-500">
              <Link to="/about" className="hover:text-primary-600">من نحن</Link>
              <Link to="/contact" className="hover:text-primary-600">تواصل معنا</Link>
              <Link to="/privacy" className="hover:text-primary-600">سياسة الخصوصية</Link>
              <Link to="/terms" className="hover:text-primary-600">الشروط والأحكام</Link>
            </nav>
          </div>
        </footer>
      </div>
    </LocationProvider>
  );
}

function NotFound() {
  return (
    <div className="text-center py-24">
      <p className="text-5xl mb-4">😕</p>
      <p className="text-gray-500">الصفحة غير موجودة</p>
    </div>
  );
}
