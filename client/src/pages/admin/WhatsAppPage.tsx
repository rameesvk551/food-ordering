import { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { useToast } from '../../components/ui/Toast';
import { MessageCircle, CheckCircle, XCircle, RefreshCw, Link2, Zap, ChevronDown, ChevronUp } from 'lucide-react';

// Extend Window for Facebook SDK
declare global {
  interface Window {
    FB: any;
    fbAsyncInit: () => void;
  }
}

const WhatsAppPage = () => {
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [showManualForm, setShowManualForm] = useState(false);
  const [form, setForm] = useState({
    accessToken: '', phoneNumberId: '', businessAccountId: '',
  });
  const { showToast } = useToast();

  // Embedded Signup state
  const [embeddedConfig, setEmbeddedConfig] = useState<any>(null);
  const [sdkReady, setSdkReady] = useState(false);
  const [sdkLoading, setSdkLoading] = useState(false);
  const [embeddedStep, setEmbeddedStep] = useState<'idle' | 'facebook' | 'completing' | 'done'>('idle');

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

  const fetchEmbeddedConfig = async () => {
    setSdkLoading(true);
    try {
      const callbackUrl = `${window.location.origin}/auth/meta/callback`;
      const res = await api.get('/whatsapp/embedded/config', {
        params: { callbackUrl }
      });
      const data = res.data?.data;
      if (data?.appId) {
        setEmbeddedConfig(data);
        loadFacebookSDK(data.appId);
      } else {
        console.warn('[WhatsAppPage] No appId received from server.');
      }
    } catch (err: any) {
      console.error('[WhatsAppPage] Error fetching embedded config:', err);
      // Optional: Inform the user why the quick-connect is missing
      // showToast('Embedded signup configuration could not be loaded.', 'warning');
    } finally {
      setSdkLoading(false);
    }
  };

  const loadFacebookSDK = (appId: string) => {
    if (!appId) return;
    setSdkLoading(true);

    if (window.FB) {
      window.FB.init({ appId, cookie: true, xfbml: true, version: 'v19.0' });
      setSdkReady(true);
      setSdkLoading(false);
      return;
    }

    window.fbAsyncInit = function () {
      window.FB.init({ appId, cookie: true, xfbml: true, version: 'v19.0' });
      setSdkReady(true);
      setSdkLoading(false);
    };

    if (document.getElementById('facebook-jssdk')) return;

    const script = document.createElement('script');
    script.id = 'facebook-jssdk';
    script.src = 'https://connect.facebook.net/en_US/sdk.js';
    script.async = true;
    script.defer = true;
    script.crossOrigin = 'anonymous';
    script.onerror = () => {
      setSdkLoading(false);
      showToast('Failed to load Facebook SDK. Check your ad-blocker.', 'error');
    };
    document.body.appendChild(script);
  };

  useEffect(() => {
    fetchStatus();
    fetchEmbeddedConfig();
  }, []);

  // ── Embedded Signup handler ──
  const handleEmbeddedSignup = useCallback(() => {
    if (!embeddedConfig?.appId) {
      showToast('Embedded configuration not loaded.', 'error');
      return;
    }

    const appId = embeddedConfig.appId;
    const configId = embeddedConfig.configId;
    const redirectUri = embeddedConfig.redirectUri || `${window.location.origin}/auth/meta/callback`;
    const state = embeddedConfig.state || 'direct_oauth';
    const scope = 'whatsapp_business_management,whatsapp_business_messaging';

    const allowedMessageOrigins = new Set<string>([window.location.origin]);
    try {
      allowedMessageOrigins.add(new URL(redirectUri).origin);
    } catch {
      // Ignore invalid redirect URI origin parsing.
    }

    const completeWithCode = async (code: string) => {
      setEmbeddedStep('completing');
      try {
        await api.post('/whatsapp/embedded/complete', { code, state });
        setEmbeddedStep('done');
        showToast('WhatsApp connected successfully!');
        fetchStatus();
      } catch (err: any) {
        showToast(err?.response?.data?.error || 'Embedded signup failed.', 'error');
        setEmbeddedStep('idle');
      }
    };

    const openOAuthPopupFallback = () => {
      const oauthUrl = `https://www.facebook.com/v19.0/dialog/oauth?client_id=${encodeURIComponent(appId)}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scope)}&response_type=code&config_id=${encodeURIComponent(configId)}&state=${encodeURIComponent(state)}&display=popup`;

      // Open popup
      const width = 600;
      const height = 700;
      const left = window.screen.width / 2 - width / 2;
      const top = window.screen.height / 2 - height / 2;
      const popup = window.open(
        oauthUrl,
        'MetaSignup',
        `width=${width},height=${height},left=${left},top=${top}`
      );

      if (!popup) {
        showToast('Popup blocked! Please allow popups for this site.', 'error');
        setEmbeddedStep('idle');
        return;
      }

      // Listen for code from popup callback page
      const handleMessage = async (event: MessageEvent) => {
        if (!allowedMessageOrigins.has(event.origin)) return;

        if (event.data?.type === 'WA_EMBEDDED_CODE') {
          const { code } = event.data;
          window.removeEventListener('message', handleMessage);
          await completeWithCode(code);
        } else if (event.data?.type === 'WA_EMBEDDED_ERROR') {
          window.removeEventListener('message', handleMessage);
          showToast('Facebook signup was cancelled or failed.', 'error');
          setEmbeddedStep('idle');
        }
      };

      window.addEventListener('message', handleMessage);

      // Backup: check if popup was closed
      const timer = setInterval(() => {
        if (popup.closed) {
          clearInterval(timer);
          setTimeout(() => {
            setEmbeddedStep(prev => prev === 'facebook' ? 'idle' : prev);
          }, 1000);
        }
      }, 1000);
    };

    setEmbeddedStep('facebook');

    // Primary path: SDK login for Embedded Signup (more reliable than manual dialog URL)
    if (window.FB && sdkReady) {
      console.log('[WhatsAppPage] Starting FB.login for Embedded Signup with sdkReady=true');
      window.FB.login(
        (response: any) => {
          console.log('[WhatsAppPage] FB.login callback received response:', response);
          const code = response?.authResponse?.code;
          if (code) {
            console.log('[WhatsAppPage] Code received from FB.login SDK, completing...');
            completeWithCode(code);
            return;
          }

          // If SDK flow is blocked or cancelled, fallback to explicit popup URL flow.
          console.log('[WhatsAppPage] No code in FB.login response. Falling back to explicit popup URL flow.');
          openOAuthPopupFallback();
        },
        {
          config_id: configId,
          response_type: 'code',
          override_default_response_type: true,
          scope,
        }
      );
      return;
    }

    console.warn('[WhatsAppPage] window.FB or sdkReady is not available. Falling back to explicit popup.');
    // Fallback path when SDK is not ready.
    openOAuthPopupFallback();
  }, [embeddedConfig, fetchStatus, showToast]);


  // ── Manual connect handler ──
  const handleManualConnect = async () => {
    if (!form.accessToken || !form.phoneNumberId || !form.businessAccountId) {
      showToast('Please fill all fields', 'error');
      return;
    }
    setConnecting(true);
    try {
      await api.post('/whatsapp/connect', form);
      showToast('WhatsApp connected successfully!');
      setShowManualForm(false);
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
            status?.connected ? 'bg-green-100' : 'bg-gray-100'
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
          <Button variant="ghost" onClick={fetchStatus} icon={<RefreshCw className="w-4 h-4" />}>
            Refresh
          </Button>
        </div>
      </div>

      {/* ── Embedded Signup Card (Primary) ── */}
      {embeddedConfig?.appId ? (
        <div className="bg-white rounded-2xl border-2 border-blue-200 shadow-sm p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
              <Zap className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-bold text-text-primary">Quick Connect with Facebook</h3>
              <p className="text-text-secondary text-xs">One-click setup — no credentials needed</p>
            </div>
          </div>

          {embeddedStep === 'idle' && (
            <div>
              <p className="text-text-secondary text-sm mb-4">
                Use Meta's Embedded Signup to instantly connect your WhatsApp Business Account.
                You'll be guided through linking your Facebook Business and selecting a phone number.
              </p>
              <button
                onClick={handleEmbeddedSignup}
                disabled={!sdkReady || sdkLoading}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-white font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ background: '#1877F2' }}
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z"/>
                </svg>
                {sdkLoading ? 'Loading Facebook SDK...' : sdkReady ? 'Connect with Facebook' : 'Initializing...'}
              </button>
            </div>
          )}

          {embeddedStep === 'facebook' && (
            <div className="text-center py-6">
              <div className="animate-spin w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full mx-auto mb-3" />
              <p className="text-text-secondary text-sm">Waiting for Facebook login to complete...</p>
              <p className="text-text-muted text-xs mt-1">A popup window should have appeared.</p>
            </div>
          )}

          {embeddedStep === 'completing' && (
            <div className="text-center py-6">
              <div className="animate-spin w-8 h-8 border-4 border-green-200 border-t-green-600 rounded-full mx-auto mb-3" />
              <p className="text-text-secondary text-sm">Linking your WhatsApp Business Account...</p>
              <p className="text-text-muted text-xs mt-1">Exchanging tokens and registering phone number.</p>
            </div>
          )}

          {embeddedStep === 'done' && (
            <div className="text-center py-6">
              <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
              <h4 className="font-bold text-text-primary mb-1">Connected Successfully!</h4>
              <p className="text-text-secondary text-sm mb-4">
                Your WhatsApp Business Account has been linked and your phone number is registered.
              </p>
              <Button variant="secondary" onClick={() => setEmbeddedStep('idle')}>
                Connect Another Account
              </Button>
            </div>
          )}
        </div>
      ) : sdkLoading ? (
        <div className="bg-white rounded-2xl border border-border animate-pulse shadow-sm p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-gray-100" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-100 rounded w-1/3" />
              <div className="h-3 bg-gray-100 rounded w-1/2" />
            </div>
          </div>
          <div className="h-12 bg-gray-100 rounded-xl w-full" />
        </div>
      ) : (
        <div className="bg-surface-secondary rounded-2xl border border-dashed border-border p-6 mb-6">
           <div className="flex items-center gap-3 text-text-muted">
             <Zap className="w-5 h-5" />
             <p className="text-xs">Quick Connect is unavailable. Please check backend connection to Partner API.</p>
           </div>
        </div>
      )}

      {/* ── Manual Connect (Collapsible Fallback) ── */}
      <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
        <button
          onClick={() => setShowManualForm(!showManualForm)}
          className="w-full flex items-center justify-between p-6 text-left hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <Link2 className="w-5 h-5 text-gray-400" />
            <div>
              <h3 className="font-semibold text-text-primary text-sm">Manual Credentials</h3>
              <p className="text-text-muted text-xs">Paste your Access Token and IDs manually</p>
            </div>
          </div>
          {showManualForm ? (
            <ChevronUp className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          )}
        </button>

        {showManualForm && (
          <div className="px-6 pb-6 pt-0 border-t border-border animate-slide-down">
            <div className="space-y-4 mt-4">
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
              <Button onClick={handleManualConnect} loading={connecting} className="w-full" variant="accent">
                Save & Connect
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default WhatsAppPage;
