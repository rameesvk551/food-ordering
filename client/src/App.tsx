import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { ToastProvider } from './components/ui/Toast';

import LoginPage from './pages/admin/LoginPage';
import DashboardLayout from './components/admin/DashboardLayout';
import OrdersPage from './pages/admin/OrdersPage';
import MenuPage from './pages/admin/MenuPage';
import WhatsAppPage from './pages/admin/WhatsAppPage';
import MetaCallbackPage from './pages/auth/MetaCallbackPage';

import StorePage from './pages/customer/StorePage';
import OrderSuccessPage from './pages/customer/OrderSuccessPage';

const App = () => {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <CartProvider>
            <Routes>
              {/* Admin Routes */}
              <Route path="/admin/login" element={<LoginPage />} />
              <Route path="/admin" element={<DashboardLayout />}>
                <Route index element={<Navigate to="/admin/orders" replace />} />
                <Route path="orders" element={<OrdersPage />} />
                <Route path="menu" element={<MenuPage />} />
                <Route path="whatsapp" element={<WhatsAppPage />} />
              </Route>

              {/* OAuth Callbacks */}
              <Route path="/auth/meta/callback" element={<MetaCallbackPage />} />

              {/* Customer Routes (slug-based per restaurant) */}
              <Route path="/:slug" element={<StorePage />} />
              <Route path="/:slug/success" element={<OrderSuccessPage />} />

              {/* Default redirect */}
              <Route path="/" element={<Navigate to="/admin/login" replace />} />
            </Routes>
          </CartProvider>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
};

export default App;
