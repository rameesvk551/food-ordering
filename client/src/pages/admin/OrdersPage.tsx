import { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';
import StatusBadge from '../../components/ui/StatusBadge';
import Button from '../../components/ui/Button';
import { OrderCardSkeleton } from '../../components/ui/Skeleton';
import { useToast } from '../../components/ui/Toast';
import { Clock, Package, ShoppingBag, CheckCircle, RefreshCw } from 'lucide-react';

interface OrderItem {
  productId: string;
  name: string;
  quantity: number;
  price: number;
}

interface Order {
  _id: string;
  customerName: string;
  customerPhone: string;
  items: OrderItem[];
  totalAmount: number;
  status: 'pending' | 'confirmed' | 'preparing' | 'completed' | 'cancelled';
  source: 'whatsapp' | 'web';
  createdAt: string;
}

const statusFlow: Record<string, string[]> = {
  pending: ['confirmed'],
  confirmed: ['preparing'],
  preparing: ['completed'],
};

const statusActions: Record<string, { label: string; icon: any; variant: any }> = {
  confirmed: { label: 'Accept', icon: CheckCircle, variant: 'accent' },
  preparing: { label: 'Preparing', icon: Package, variant: 'primary' },
  completed: { label: 'Complete', icon: CheckCircle, variant: 'accent' },
};

const OrdersPage = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const { showToast } = useToast();

  const fetchOrders = useCallback(async () => {
    try {
      const params: any = {};
      if (filter !== 'all') params.status = filter;
      const res = await api.get('/orders', { params });
      setOrders(res.data.orders);
    } catch {
      showToast('Failed to fetch orders', 'error');
    } finally {
      setLoading(false);
    }
  }, [filter, showToast]);

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 10000); // Poll every 10s
    return () => clearInterval(interval);
  }, [fetchOrders]);

  const updateStatus = async (orderId: string, status: string) => {
    try {
      await api.patch(`/orders/${orderId}/status`, { status });
      setOrders((prev) =>
        prev.map((o) => (o._id === orderId ? { ...o, status: status as any } : o))
      );
      showToast(`Order ${status}!`, 'success');
    } catch {
      showToast('Failed to update order', 'error');
    }
  };

  const filterTabs = ['all', 'pending', 'confirmed', 'preparing', 'completed'];

  const timeAgo = (date: string) => {
    const mins = Math.floor((Date.now() - new Date(date).getTime()) / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    return `${Math.floor(mins / 60)}h ago`;
  };

  return (
    <div className="animate-fade-in px-2 md:px-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-text-primary">Orders</h1>
          <p className="text-text-secondary text-xs md:text-sm mt-1">Manage incoming orders in real-time</p>
        </div>
        <Button 
          variant="secondary" 
          onClick={fetchOrders} 
          icon={<RefreshCw className="w-4 h-4" />}
          className="w-full sm:w-auto justify-center"
        >
          Refresh
        </Button>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-4 scrollbar-hide -mx-2 px-2">
        {filterTabs.map((tab) => (
          <button
            key={tab}
            onClick={() => { setFilter(tab); setLoading(true); }}
            className={`
              px-4 py-2 rounded-xl text-xs md:text-sm font-medium whitespace-nowrap transition-all duration-200 btn-press cursor-pointer
              ${filter === tab
                ? 'bg-primary-500 text-white shadow-md shadow-primary-500/25'
                : 'bg-white text-text-secondary hover:bg-gray-50 border border-border'
              }
            `}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Orders Grid */}
      {loading ? (
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <OrderCardSkeleton key={i} />
          ))}
        </div>
      ) : orders.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-border mx-2">
          <ShoppingBag className="w-16 h-16 text-text-muted mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-text-primary mb-2">No orders yet</h3>
          <p className="text-text-secondary text-sm">New orders will appear here in real-time</p>
        </div>
      ) : (
        <div className="grid gap-3 md:gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {orders.map((order) => (
            <div
              key={order._id}
              className="bg-white rounded-2xl border border-border shadow-sm hover:shadow-md transition-shadow duration-300 overflow-hidden"
            >
              {/* Order Header */}
              <div className="p-5 pb-3">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-bold text-text-primary">
                      {order.customerName || 'Unknown Customer'}
                    </h3>
                    <p className="text-xs text-text-muted flex items-center gap-1 mt-1">
                      <Clock className="w-3 h-3" />
                      {timeAgo(order.createdAt)}
                      <span className={`ml-2 px-1.5 py-0.5 rounded text-xs font-medium ${
                        order.source === 'whatsapp' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                      }`}>
                        {order.source === 'whatsapp' ? '💬 WhatsApp' : '🌐 Web'}
                      </span>
                    </p>
                  </div>
                  <StatusBadge status={order.status} />
                </div>

                {/* Items */}
                <div className="space-y-1.5 mb-3">
                  {order.items.map((item, i) => (
                    <div key={i} className="flex justify-between text-sm">
                      <span className="text-text-secondary">
                        {item.quantity}x {item.name}
                      </span>
                      <span className="font-medium text-text-primary">
                        ₹{item.price * item.quantity}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="flex justify-between items-center pt-3 border-t border-border">
                  <span className="text-lg font-bold text-text-primary">₹{order.totalAmount}</span>
                  <div className="flex gap-2">
                    {(statusFlow[order.status] || []).map((nextStatus) => {
                      const action = statusActions[nextStatus];
                      if (!action) return null;
                      const Icon = action.icon;
                      return (
                        <Button
                          key={nextStatus}
                          variant={action.variant}
                          size="sm"
                          onClick={() => updateStatus(order._id, nextStatus)}
                          icon={<Icon className="w-4 h-4" />}
                        >
                          {action.label}
                        </Button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default OrdersPage;
