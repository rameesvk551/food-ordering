const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { MongoClient } = require('mongodb');

// Verified Production Constants
const ACCESS_TOKEN = 'EAAhBw75WTTkBRHCIwbKk4jykfWf24WGhZBXqDm5NNioqpFIGu3aLb2I4ppXbdYqj6yZC1oZAjCnVSSW3DyV1CYZCQP067XEnodYA7rafiXO7YjcJg3NXpOFq1OSWZBiAzh75i8i6nZBcbwcCQ6kx6B2qCRGxoXbZCUPEqFbvETqAqfTCf0RgVtUGs1NpdPRNfQoudPE41WqeX0ZCIeyfDMkUIeOoUAhXZCkZBypZBjf';
const WABA_ID = '864633239519648';
const PHONE_NUM_ID = '919556244575947';
const API_URL = 'https://graph.facebook.com/v18.0';

const PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAmNP03/tSKwNnKckiHROc
PW/Fhn96SJhgjjJfPrjcPrgj1+hAQvnt0RAPH9PlTmBY50WKpXo3pKtDLDH/C4bS
R81a8+u++S1WAXSpg0UKIblctAZOkmOE+zwUgq0fPY9UIIa+vEWBMTYylaWXjffJ
5jg2XIGcX07UUxDln1b6JOKSb6fTt38TE1rtXeDCWqNrUqG4Oc8j11C7rVGv4ltM
6FQu0LSb5UJ+zPA9uxH8GgzJh2oMBjxChQfTGBxIjOKZrogRdrNyIjv9IwB5sY2P
TrciYG0CgNzpGn7Ma3vD6wSGBuZ+3t/g06PISNAU66VzAGl31OW6+YqCujlrI7nf
AwIDAQAB
-----END PUBLIC KEY-----`;

async function deploy() {
  try {
    console.log('--- Starting Final Automated Deployment ---');

    // 1. Upload Public Key to Phone Number
    console.log('Uploading Public Key to Phone Number...');
    await axios.post(`${API_URL}/${PHONE_NUM_ID}/whatsapp_business_encryption`, {
      business_public_key: PUBLIC_KEY
    }, { params: { access_token: ACCESS_TOKEN } });
    console.log('Public Key Uploaded Successfully.');

    // 2. Create Flow
    console.log('Creating flow: wayo_menu_v9...');
    const createRes = await axios.post(`${API_URL}/${WABA_ID}/flows`, {
      name: 'wayo_menu_v9',
      categories: ['OTHER']
    }, { params: { access_token: ACCESS_TOKEN } });
    
    const flowId = createRes.data.id;
    console.log('Flow Created Successfully. ID:', flowId);

    // 3. Upload Asset
    console.log('Uploading JSON Asset (v7.0 Fixed)...');
    const jsonPath = '/home/ec2-user/food-ordering/server/src/assets/menu_flow.json';
    const FormData = require('form-data');
    const formData = new FormData();
    formData.append('name', 'flow.json');
    formData.append('asset_type', 'FLOW_JSON');
    formData.append('file', fs.createReadStream(jsonPath));

    await axios.post(`${API_URL}/${flowId}/assets`, formData, {
      headers: formData.getHeaders(),
      params: { access_token: ACCESS_TOKEN }
    });
    console.log('Asset Uploaded Successfully.');

    // 4. Update Endpoint
    console.log('Configuring Data Endpoint...');
    await axios.post(`${API_URL}/${flowId}`, {
      endpoint_uri: 'https://api.food.wayon.in/api/whatsapp/flow'
    }, { params: { access_token: ACCESS_TOKEN } });
    console.log('Endpoint Set Successfully.');

    // 5. Publish Flow
    console.log('Publishing Flow...');
    await axios.post(`${API_URL}/${flowId}/publish`, {}, {
      params: { access_token: ACCESS_TOKEN }
    });
    console.log('Flow Published SUCCESSFULLY.');

    // 6. Update Database
    console.log('Updating Database for Wayo...');
    const client = new MongoClient('mongodb://localhost:27018/food-ordering?directConnection=true');
    await client.connect();
    const db = client.db('food-ordering');
    await db.collection('restaurants').updateOne(
      { name: /Wayo/i },
      { $set: { whatsappFlowId: flowId } }
    );
    await client.close();
    console.log('Database Updated Successfully.');
    
    console.log('--- ALL SYSTEMS GREEN ---');
    console.log('FINAL FLOW ID:', flowId);

  } catch (error) {
    if (error.response) {
      console.error('Deployment Failed:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error('Deployment Failed:', error.message);
    }
    process.exit(1);
  }
}

deploy();
