const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { MongoClient } = require('mongodb');

// Verified Production Constants
const ACCESS_TOKEN = 'EAAhBw75WTTkBRHCIwbKk4jykfWf24WGhZBXqDm5NNioqpFIGu3aLb2I4ppXbdYqj6yZC1oZAjCnVSSW3DyV1CYZCQP067XEnodYA7rafiXO7YjcJg3NXpOFq1OSWZBiAzh75i8i6nZBcbwcCQ6kx6B2qCRGxoXbZCUPEqFbvETqAqfTCf0RgVtUGs1NpdPRNfQoudPE41WqeX0ZCIeyfDMkUIeOoUAhXZCkZBypZBjf';
const WABA_ID = '864633239519648';
const PHONE_NUM_ID = '919556244575947';
const API_URL = 'https://graph.facebook.com/v19.0';
const flowId = '1396455595617420'; // Wayo Flow
const flowVersion = '27'; // v27: Category Images via NavigationList
const flowName = `wayo_menu_v${flowVersion}`;

const PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAqBoQKPHYsUVfRGqVVfQR
r/JIDIopf81yB6KiafweNecycV+rfjWcfIQYqeJQN1nBxLjLrIwOcOziblEsPftq
pkfa5LXE4V0SRf/CHCd2dHmiYG2PNuREG4Eis1omeOoIG9IrR5aQIENRBiRyuWln
MgPxHlhCRU4uy2Z4/FWMLrqZBAQ8wPZoFEremP7b9nkPbeyt3c4GmRKQy2DzhCDs
Dr3IkRGGXVw5FK3P4JlqgLZ1NZt3/Pn/P0tpH/QM3gIqI8tCs5IiA4GVOuKhinKw
ZkKQCMijQ7czXeu+Ap1ssWWdAka+MrNtMAboKB+80fF9VlZxZ5L1A0JkbsPsUu5u
lwIDAQAB
-----END PUBLIC KEY-----`;

async function deploy() {
  try {
    console.log('--- Starting Final Automated Deployment ---');

    // 1. Upload Public Key to Phone Number
    console.log('Skipping Public Key upload (already synchronized with EC2)...');

    // 2. Create Flow
    console.log(`Creating flow: ${flowName}...`);
    const createRes = await axios.post(`${API_URL}/${WABA_ID}/flows`, {
      name: flowName,
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

    // 4. Update Endpoint (Correct Field: endpoint_uri)
    console.log('Configuring Data Endpoint...');
    // IMPORTANT: Metadata updates must be sent to the Flow ID, not a sub-resource
    await axios.post(`${API_URL}/${flowId}`, {
      endpoint_uri: 'https://api.app.wayon.in/api/whatsapp/flow'
    }, { params: { access_token: ACCESS_TOKEN } });
    console.log('Endpoint Set SUCCESSFULLY.');

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
