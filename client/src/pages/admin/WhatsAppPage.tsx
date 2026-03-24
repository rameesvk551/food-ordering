import { useState, useEffect } from 'react';
import api from '../../services/api';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { useToast } from '../../components/ui/Toast';
import { MessageCircle, CheckCircle, XCircle, RefreshCw, Link2 } from 'lucide-react';

const WhatsAppPage = () => {
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    accessToken: '', phoneNumberId: '', businessAccountId: '',
  });
  const { showToast } = useToast();

  const fetchStatus = async () => {
    try {
      const res = await api.get('/whatsapp/status');
      setStatus(res.data);
    } catch {
      showToast('Failed to fetch status', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchStatus(); }, []);

  const handleConnect = async () => {
    if (!form.accessToken || !form.phoneNumberId || !form.businessAccountId) {
      showToast('Please fill all fields', 'error');
      return;
    }
    setConnecting(true);
    try {
      await api.post('/whatsapp/connect', form);
      showToast('WhatsApp connected successfully!');
      setShowForm(false);
      fetchStatus();
    } catch {
      showToast('Failed to connect WhatsApp', 'error');
    } finally {
      setConnecting(false);
    }
  };

  if (loading) {
    return (
      <div className="animate-fade-in space-y-6">
        <div className="skeleton h-8 w-48" />
        <div className="skeleton h-64 w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="animate-fade-in max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text-primary">WhatsApp Integration</h1>
        <p className="text-text-secondary text-sm mt-1">Connect your WhatsApp Business account</p>
      </div>

      {/* Status Card */}
      <div className="bg-white rounded-2xl border border-border shadow-sm p-8 mb-6">
        <div className="flex items-center gap-4 mb-6">
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${
            status?.connected
              ? 'bg-green-100'
              : 'bg-gray-100'
          }`}>
            <MessageCircle className={`w-7 h-7 ${
              status?.connected ? 'text-green-600' : 'text-gray-400'
            }`} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              {status?.connected ? (
                <CheckCircle className="w-5 h-5 text-green-500" />
              ) : (
                <XCircle className="w-5 h-5 text-red-400" />
              )}
              <h3 className="font-bold text-text-primary text-lg">
                {status?.connected ? 'Connected' : 'Not Connected'}
              </h3>
            </div>
            {status?.phoneNumber && (
              <p className="text-text-secondary text-sm mt-1">Phone: {status.phoneNumber}</p>
            )}
          </div>
        </div>

        {status?.connected && (
          <div className="grid grid-cols-2 gap-4 p-4 bg-surface-secondary rounded-xl mb-6">
            <div>
              <p className="text-xs text-text-muted font-medium uppercase tracking-wider">Phone Number ID</p>
              <p className="text-sm text-text-primary font-mono mt-1 truncate">{status.phoneNumberId}</p>
            </div>
            <div>
              <p className="text-xs text-text-muted font-medium uppercase tracking-wider">Business Account ID</p>
              <p className="text-sm text-text-primary font-mono mt-1 truncate">{status.businessAccountId}</p>
            </div>
          </div>
        )}

        <div className="flex gap-3">
          <Button
            variant={status?.connected ? 'secondary' : 'accent'}
            onClick={() => setShowForm(!showForm)}
            icon={<Link2 className="w-4 h-4" />}
          >
            {status?.connected ? 'Reconnect WhatsApp' : 'Connect WhatsApp'}
          </Button>
          <Button variant="ghost" onClick={fetchStatus} icon={<RefreshCw className="w-4 h-4" />}>
            Refresh
          </Button>
        </div>
      </div>

      {/* Connect Form */}
      {showForm && (
        <div className="bg-white rounded-2xl border border-border shadow-sm p-6 animate-slide-down">
          <h3 className="font-bold text-text-primary mb-4">WhatsApp Credentials</h3>
          <div className="space-y-4">
            <Input
              label="Access Token"
              placeholder="EAAxxxxxxx..."
              value={form.accessToken}
              onChange={(e) => setForm({ ...form, accessToken: e.target.value })}
            />
            <Input
              label="Phone Number ID"
              placeholder="1234567890"
              value={form.phoneNumberId}
              onChange={(e) => setForm({ ...form, phoneNumberId: e.target.value })}
            />
            <Input
              label="Business Account ID"
              placeholder="9876543210"
              value={form.businessAccountId}
              onChange={(e) => setForm({ ...form, businessAccountId: e.target.value })}
            />
            <Button onClick={handleConnect} loading={connecting} className="w-full" variant="accent">
              Save & Connect
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default WhatsAppPage;
