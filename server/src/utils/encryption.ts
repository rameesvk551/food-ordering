import CryptoJS from 'crypto-js';
import { env } from '../config/env';

export const encrypt = (text: string): string => {
  return CryptoJS.AES.encrypt(text, env.encryptionKey).toString();
};

export const decrypt = (ciphertext: string): string => {
  const bytes = CryptoJS.AES.decrypt(ciphertext, env.encryptionKey);
  return bytes.toString(CryptoJS.enc.Utf8);
};
