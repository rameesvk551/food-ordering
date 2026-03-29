import dotenv from 'dotenv';
dotenv.config();

export const env = {
  port: parseInt(process.env.PORT || '5000', 10),
  mongodbUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/food-ordering',
  jwtSecret: process.env.JWT_SECRET || 'default-secret',
  encryptionKey: process.env.ENCRYPTION_KEY || 'default-encryption-key-32chars!',
  whatsappVerifyToken: process.env.WHATSAPP_VERIFY_TOKEN || 'verify-token',
  whatsappAccessToken: process.env.WHATSAPP_ACCESS_TOKEN || '',
  marketingOsApiBaseUrl: process.env.MARKETING_OS_API_BASE_URL || '',
  marketingOsReferralCode: process.env.MARKETING_OS_REFERRAL_CODE || '',
  marketingOsPartnerKey: process.env.MARKETING_OS_PARTNER_KEY || '',
  marketingOsProvisionEnabled: String(process.env.MARKETING_OS_PROVISION_ENABLED).toLowerCase() === 'true',
  marketingOsWebhookSecret: process.env.MARKETING_OS_WEBHOOK_SECRET || '',
  nodeEnv: process.env.NODE_ENV || 'development',
};

// Diagnostic Logging for Marketing OS
if (env.nodeEnv === 'production' || env.marketingOsApiBaseUrl) {
  console.log('[Config] Marketing OS Status:', {
    enabled: env.marketingOsProvisionEnabled,
    baseUrl: env.marketingOsApiBaseUrl ? 'SET' : 'MISSING',
    partnerKey: env.marketingOsPartnerKey ? 'SET (masked)' : 'MISSING',
    nodeEnv: env.nodeEnv
  });
}

