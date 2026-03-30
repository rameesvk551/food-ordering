import axios from 'axios';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { env } from '../config/env';

const WHATSAPP_API_URL = 'https://graph.facebook.com/v18.0';

export const createAndPublishFlow = async (
  wabaId: string,
  accessToken: string,
  appName: string
): Promise<string | null> => {
  try {
    // 1. Create the Flow
    const createRes = await axios.post(
      `${WHATSAPP_API_URL}/${wabaId}/flows`,
      {
        name: `menu_flow_${crypto.randomBytes(4).toString('hex')}`,
        categories: ['CUSTOMER_SUPPORT'],
        clone_flow_id: '' // Can be used to clone a master flow
      },
      {
        headers: { Authorization: `Bearer ${accessToken}` }
      }
    );

    const flowId = createRes.data.id;
    if (!flowId) throw new Error('Failed to create flow ID');

    // 2. Upload the Flow JSON asset
    const flowJsonPath = path.join(__dirname, '../assets/menu_flow.json');
    if (!fs.existsSync(flowJsonPath)) {
      throw new Error(`Flow JSON not found at ${flowJsonPath}`);
    }

    const flowJsonContent = fs.readFileSync(flowJsonPath, 'utf-8');

    // WhatsApp expects multipart/form-data for asset upload
    const FormData = require('form-data');
    const form = new FormData();
    form.append('file', fs.createReadStream(flowJsonPath), {
      filename: 'menu_flow.json',
      contentType: 'application/json'
    });
    form.append('name', 'flow.json');
    form.append('asset_type', 'FLOW_JSON');

    await axios.post(
      `${WHATSAPP_API_URL}/${flowId}/assets`,
      form,
      {
        headers: {
          ...form.getHeaders(),
          Authorization: `Bearer ${accessToken}` 
        }
      }
    );

    // 3. Update the endpoint (Webhook) for the Flow
    const endpointUrl = `${env.marketingOsApiBaseUrl || 'https://your-domain.com'}/api/whatsapp/flow`;
    
    // We need to fetch the Public Key derived from our Private Key to upload to Meta
    if (env.whatsappFlowPrivateKey) {
      const privateKey = crypto.createPrivateKey(env.whatsappFlowPrivateKey);
      const publicKeyPem = crypto.createPublicKey(privateKey).export({ type: 'spki', format: 'pem' });
      
      await axios.post(
        `${WHATSAPP_API_URL}/${flowId}`,
        {
          endpoint_uri: endpointUrl,
          application_public_key: publicKeyPem as string
        },
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
    }

    // 4. Publish the Flow
    await axios.post(
      `${WHATSAPP_API_URL}/${flowId}/publish`,
      {},
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    return flowId;
  } catch (error: any) {
    console.error('Error creating/publishing Flow:', error.response?.data || error.message);
    return null; // Don't throw to disrupt normal onboarding, just return null
  }
};
