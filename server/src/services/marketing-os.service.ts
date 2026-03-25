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

const buildTempPassword = (): string => {
  const base = env.marketingOsDefaultPassword;
  if (base) {
    return base;
  }

  const random = crypto.randomBytes(6).toString('hex');
  return `MoTemp#${random}`;
};

const isEnabled = () => env.marketingOsProvisionEnabled && env.marketingOsApiBaseUrl;

// ── Login to Marketing OS (get a JWT for a provisioned restaurant) ──

export const loginToMarketingOs = async (email: string): Promise<string | null> => {
  if (!isEnabled()) return null;

  const password = buildTempPassword();

  try {
    const resp = await axios.post(
      `${env.marketingOsApiBaseUrl}/auth/login`,
      { email, password },
      { timeout: 10000 }
    );

    return resp.data?.token || resp.data?.data?.token || null;
  } catch (error: any) {
    console.warn('[MarketingOS] Login failed:', error?.response?.data?.message || error?.message);
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

  const tempPassword = buildTempPassword();

  try {
    const resp = await axios.post(
      `${env.marketingOsApiBaseUrl}/auth/register`,
      {
        tenantName: input.restaurantName,
        userName: input.userName,
        email: input.email,
        password: tempPassword,
        ...(env.marketingOsReferralCode ? { referralCode: env.marketingOsReferralCode } : {}),
      },
      { timeout: 10000 }
    );

    const token = resp.data?.token || resp.data?.data?.token || null;

    return {
      attempted: true,
      provisioned: true,
      alreadyExists: false,
      tempPassword,
      token,
      message: env.marketingOsReferralCode
        ? 'Client provisioned in Marketing OS with partner referral.'
        : 'Client provisioned in Marketing OS (no partner referral configured yet).',
    };
  } catch (error: any) {
    const apiMessage = error?.response?.data?.message || error?.response?.data?.error || error?.message;
    const status = error?.response?.status;

    if (status === 409 || String(apiMessage || '').toLowerCase().includes('already exists')) {
      return {
        attempted: true,
        provisioned: false,
        alreadyExists: true,
        message: 'Marketing OS user already exists for this email.',
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
  token: string
): Promise<MarketingOsEmbeddedConfig | null> => {
  if (!isEnabled()) return null;

  try {
    const resp = await axios.get(
      `${env.marketingOsApiBaseUrl}/whatsapp/settings/embedded/config`,
      {
        headers: { Authorization: `Bearer ${token}` },
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
      `${env.marketingOsApiBaseUrl}/whatsapp/settings/embedded/complete`,
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
