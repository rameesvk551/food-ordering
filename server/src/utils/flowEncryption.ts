import crypto from 'crypto';
import { env } from '../config/env';

/**
 * Decrypts the request from WhatsApp Flows.
 * @param encryptedAesKey Base64 encoded AES key encrypted with our RSA public key
 * @param encryptedFlowData Base64 encoded payload encrypted with AES
 * @param initialVector Base64 encoded IV
 * @returns Decrypted payload as string and the decrypted AES key
 */
export const decryptFlowRequest = (
  encryptedAesKey: string,
  encryptedFlowData: string,
  initialVector: string
) => {
  // Ensure the private key is configured
  if (!env.whatsappFlowPrivateKey) {
    throw new Error('whatsappFlowPrivateKey is not configured in environment variables');
  }

  // 1. Decrypt the AES key using our RSA private key
  const privateKey = crypto.createPrivateKey({
    key: env.whatsappFlowPrivateKey,
    format: 'pem',
  });

  const decryptedAesKey = crypto.privateDecrypt(
    {
      key: privateKey,
      padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: 'sha256',
    },
    Buffer.from(encryptedAesKey, 'base64')
  );

  // 2. Decrypt the flow data using the decrypted AES key and IV
  const flowDataBuffer = Buffer.from(encryptedFlowData, 'base64');
  const ivBuffer = Buffer.from(initialVector, 'base64');

  // WhatsApp's AES-GCM payload structure:
  // The last 16 bytes of the encrypted data is the auth tag
  const authTagLength = 16;
  const encryptedData = flowDataBuffer.subarray(0, flowDataBuffer.length - authTagLength);
  const authTag = flowDataBuffer.subarray(flowDataBuffer.length - authTagLength);

  const decipher = crypto.createDecipheriv('aes-256-gcm', decryptedAesKey, ivBuffer);
  decipher.setAuthTag(authTag);

  let decryptedData = decipher.update(encryptedData);
  decryptedData = Buffer.concat([decryptedData, decipher.final()]);

  return {
    decryptedBody: JSON.parse(decryptedData.toString('utf-8')),
    aesKeyBuffer: decryptedAesKey,
    initialVectorBuffer: ivBuffer,
  };
};

/**
 * Encrypts the response to send back to WhatsApp Flows.
 * @param responseObj The JSON object to send
 * @param aesKeyBuffer The AES key decrypted from the request
 * @param initialVectorBuffer The IV from the request
 * @returns Base64 encoded encrypted response
 */
export const encryptFlowResponse = (
  responseObj: any,
  aesKeyBuffer: Buffer,
  initialVectorBuffer: Buffer
): string => {
  // Invert the IV by flipping all bits (required by WhatsApp spec)
  const flippedIv = Buffer.alloc(initialVectorBuffer.length);
  for (let i = 0; i < initialVectorBuffer.length; i++) {
    flippedIv[i] = ~initialVectorBuffer[i];
  }

  const cipher = crypto.createCipheriv('aes-256-gcm', aesKeyBuffer, flippedIv);
  
  const responseStr = JSON.stringify(responseObj);
  let encrypted = cipher.update(responseStr, 'utf-8');
  encrypted = Buffer.concat([encrypted, cipher.final()]);

  const authTag = cipher.getAuthTag();

  // Combine ciphertext and authTag
  const finalEncryptedData = Buffer.concat([encrypted, authTag]);

  return finalEncryptedData.toString('base64');
};
