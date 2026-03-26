import axios from 'axios';
import crypto from 'crypto';
import { env } from '../config/env';

// ── Types ──

interface ProvisionMarketingOsInput {
  restaurantName: string;
  userName: string;
  email: string;
}

interface ProvisionMarketingOsResult {
  attempted: boolean;
  provisioned: boolean;
  alreadyExists: boolean;
  tempPassword?: string;
  token?: string;
  message?: string;
}

interface MarketingOsEmbeddedConfig {
  appId: string;
  configId?: string;
  redirectUri?: string;
  state?: string;
}

interface MarketingOsEmbeddedCompleteResult {
  success: boolean;
  phoneNumberId?: string;
  wabaId?: string;
  phoneDisplay?: string;
  accessToken?: string;
  error?: string;
}

// ── Helpers ──

const isEnabled = () => env.marketingOsProvisionEnabled && env.marketingOsApiBaseUrl && env.marketingOsPartnerKey;

/**
 * Normalizes the API Base URL to ensure it ends exactly with /api/v1 once.
 */
const getNormalizedV1Url = () => {
  let base = env.marketingOsApiBaseUrl || '';
  if (base.endsWith('/')) base = base.slice(0, -1);
  
  // If it already ends with /api/v1, use it.
  if (base.endsWith('/api/v1')) return base;
  
  // Otherwise append /api/v1
  return `${base}/api/v1`;
};

/**
 * Get a JWT token for a specific tenant using the Partner API Key.
 * This replaces the need for restaurant/user passwords.
 */
export const getMarketingOsPartnerToken = async (tenantId: string): Promise<string | null> => {
  if (!isEnabled()) return null;

  try {
    const resp = await axios.post(
      `${getNormalizedV1Url()}/tenants/${tenantId}/token`,
      {},
      {
        headers: { 'x-api-key': env.marketingOsPartnerKey },
        timeout: 10000,
      }
    );

    return resp.data?.data?.token || null;
  } catch (error: any) {
    console.warn('[MarketingOS] Failed to get partner token:', error?.response?.data?.message || error?.message);
    return null;
  }
};

// ── Provision restaurant in Marketing OS ──

export const provisionClientInMarketingOs = async (
  input: ProvisionMarketingOsInput
): Promise<ProvisionMarketingOsResult> => {
  if (!isEnabled()) {
    return {
      attempted: false,
      provisioned: false,
      alreadyExists: false,
      message: 'Marketing OS provisioning is disabled or incomplete in env.',
    };
  }

  try {
    // We use the Partner API to create a tenant. 
    const resp = await axios.post(
      `${getNormalizedV1Url()}/tenants`,
      {
        name: input.restaurantName,
        email: input.email,
        metadata: {
          provisionedBy: 'food-ordering-partner',
          userName: input.userName,
        },
      },
      {
        headers: { 'x-api-key': env.marketingOsPartnerKey },
        timeout: 10000,
      }
    );

    const tenantId = resp.data?.data?.tenantId;

    return {
      attempted: true,
      provisioned: true,
      alreadyExists: false,
      message: `Client provisioned as tenant: ${tenantId}`,
    };
  } catch (error: any) {
    const apiMessage = error?.response?.data?.message || error?.response?.data?.error || error?.message;
    const status = error?.response?.status;

    if (status === 409 || String(apiMessage || '').toLowerCase().includes('already exists')) {
      return {
        attempted: true,
        provisioned: false,
        alreadyExists: true,
        message: 'Marketing OS tenant already exists for this email.',
      };
    }

    return {
      attempted: true,
      provisioned: false,
      alreadyExists: false,
      message: `Marketing OS provisioning failed: ${apiMessage || 'unknown error'}`,
    };
  }
};

// ── Get Embedded Signup config from Marketing OS ──

export const getMarketingOsEmbeddedConfig = async (
  token: string,
  callbackUrl?: string
): Promise<MarketingOsEmbeddedConfig | null> => {
  if (!isEnabled()) return null;

  try {
    const params = callbackUrl ? { callbackUrl } : undefined;
    const resp = await axios.get(
      `${getNormalizedV1Url()}/whatsapp/settings/embedded/config`,
      {
        headers: { Authorization: `Bearer ${token}` },
        params,
        timeout: 10000,
      }
    );

    return resp.data?.data || null;
  } catch (error: any) {
    console.error('[MarketingOS] Failed to get embedded config:', error?.response?.data || error?.message);
    return null;
  }
};

// ── Complete Embedded Signup via Marketing OS ──

export const completeMarketingOsEmbeddedSignup = async (
  token: string,
  code: string,
  state?: string
): Promise<MarketingOsEmbeddedCompleteResult> => {
  if (!isEnabled()) {
    return { success: false, error: 'Marketing OS is not configured.' };
  }

  try {
    const resp = await axios.post(
      `${getNormalizedV1Url()}/whatsapp/settings/embedded/complete`,
      { code, state },
      {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 30000,
      }
    );

    const data = resp.data?.data;

    return {
      success: data?.success ?? true,
      phoneNumberId: data?.connection?.phoneNumberId || null,
      wabaId: data?.connection?.whatsappBusinessAccountId || null,
      phoneDisplay: data?.connection?.displayPhoneNumber || null,
      accessToken: data?.accessToken || null,
    };
  } catch (error: any) {
    const apiMessage = error?.response?.data?.error || error?.message;
    console.error('[MarketingOS] Embedded signup completion failed:', apiMessage);
    return { success: false, error: apiMessage || 'Unknown error' };
  }
};


