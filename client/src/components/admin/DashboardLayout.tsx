import { useState } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Sidebar from './Sidebar';
import { Menu } from 'lucide-react';

const DashboardLayout = () => {
  const { user, loading } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen bg-primary-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary-200 border-t-primary-500 rounded-full animate-spin" />
          <p className="text-text-secondary text-sm font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/admin/login" replace />;
  }

  return (
    <div className="min-h-screen bg-primary-50">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      
      {/* Mobile Top Header */}
      <header className="lg:hidden h-16 bg-white border-b border-border flex items-center px-4 sticky top-0 z-20">
        <button 
          onClick={() => setIsSidebarOpen(true)}
          className="p-2 -ml-2 rounded-lg hover:bg-gray-50 text-text-secondary"
        >
          <Menu className="w-6 h-6" />
        </button>
        <span className="ml-3 font-bold text-primary-600">FoodOrder</span>
      </header>

      <main 
        className={`transition-all duration-300 min-h-screen
          lg:ml-64 p-4 md:p-6
        `}
      >
        <Outlet />
      </main>
    </div>
  );
};

export default DashboardLayout;
