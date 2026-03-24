import dotenv from 'dotenv';
dotenv.config();

export const env = {
  port: parseInt(process.env.PORT || '5000', 10),
  mongodbUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/food-ordering',
  jwtSecret: process.env.JWT_SECRET || 'default-secret',
  encryptionKey: process.env.ENCRYPTION_KEY || 'default-encryption-key-32chars!',
  whatsappVerifyToken: process.env.WHATSAPP_VERIFY_TOKEN || 'verify-token',
  nodeEnv: process.env.NODE_ENV || 'development',
};
