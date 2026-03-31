/**
 * All-in-one script: generates keypair ON the server, updates .env,
 * uploads public key to Meta, creates flow, publishes.
 * Run this directly on EC2.
 */
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

const ACCESS_TOKEN = 'EAAhBw75WTTkBRHCIwbKk4jykfWf24WGhZBXqDm5NNioqpFIGu3aLb2I4ppXbdYqj6yZC1oZAjCnVSSW3DyV1CYZCQP067XEnodYA7rafiXO7YjcJg3NXpOFq1OSWZBiAzh75i8i6nZBcbwcCQ6kx6B2qCRGxoXbZCUPEqFbvETqAqfTCf0RgVtUGs1NpdPRNfQoudPE41WqeX0ZCIeyfDMkUIeOoUAhXZCkZBypZBjf';
const WABA_ID = '864633239519648';
const PHONE_NUM_ID = '919556244575947';
const API_URL = 'https://graph.facebook.com/v18.0';
const FLOW_NAME = 'wayo_menu_v20';
const ENV_PATH = path.join(__dirname, '.env');

async function main() {
  try {
    // ── Step 1: Generate a fresh RSA 2048 keypair (PKCS#8 format) ──
    console.log('[1/7] Generating fresh RSA-2048 keypair (PKCS#8)...');
    const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
    });
    const privatePem = privateKey.export({ type: 'pkcs8', format: 'pem' });
    const publicPem = publicKey.export({ type: 'spki', format: 'pem' });

    // Verify the key works with OpenSSL on this machine
    const testKey = crypto.createPrivateKey({ key: privatePem, format: 'pem' });
    console.log('   Key generated and verified OK. Type:', testKey.asymmetricKeyType);

    // ── Step 2: Store private key (base64-encoded) in .env ──
    console.log('[2/7] Updating .env with base64-encoded private key...');
    const b64Key = Buffer.from(privatePem).toString('base64');
    let envContent = fs.readFileSync(ENV_PATH, 'utf8');
    if (envContent.match(/^WHATSAPP_FLOW_PRIVATE_KEY=.*/m)) {
      envContent = envContent.replace(/^WHATSAPP_FLOW_PRIVATE_KEY=.*/m, `WHATSAPP_FLOW_PRIVATE_KEY=${b64Key}`);
    } else {
      envContent += `\nWHATSAPP_FLOW_PRIVATE_KEY=${b64Key}\n`;
    }
    fs.writeFileSync(ENV_PATH, envContent);
    console.log('   .env updated successfully.');

    // ── Step 3: Quick sanity check – can we decode it back? ──
    console.log('[3/7] Sanity check: decoding key from .env...');
    const reread = fs.readFileSync(ENV_PATH, 'utf8');
    const match = reread.match(/^WHATSAPP_FLOW_PRIVATE_KEY=(.*)$/m);
    const decoded = Buffer.from(match[1], 'base64').toString('utf8');
    crypto.createPrivateKey({ key: decoded, format: 'pem' });
    console.log('   Round-trip OK – key decodes and parses correctly.');

    console.log('Restarting PM2 to load the new private key...');
    require('child_process').execSync('npm run build && pm2 restart all', { stdio: 'inherit' });
    console.log('PM2 restarted. Waiting 5 seconds for server to boot...');
    await new Promise(res => setTimeout(res, 5000));

    // ── Step 4: Upload public key to Meta ──
    console.log('[4/7] Uploading public key to WhatsApp Business...');
    await axios.post(`${API_URL}/${PHONE_NUM_ID}/whatsapp_business_encryption`, {
      business_public_key: publicPem
    }, { params: { access_token: ACCESS_TOKEN } });
    console.log('   Public key uploaded.');

    // ── Step 5: Create Flow ──
    console.log(`[5/7] Creating flow: ${FLOW_NAME}...`);
    const createRes = await axios.post(`${API_URL}/${WABA_ID}/flows`, {
      name: FLOW_NAME,
      categories: ['OTHER']
    }, { params: { access_token: ACCESS_TOKEN } });
    const flowId = createRes.data.id;
    console.log(`   Flow created. ID: ${flowId}`);

    // ── Step 6: Upload JSON asset + set endpoint ──
    console.log('[6/7] Uploading flow JSON and setting endpoint...');
    const FormData = require('form-data');
    const formData = new FormData();
    formData.append('name', 'flow.json');
    formData.append('asset_type', 'FLOW_JSON');
    formData.append('file', fs.createReadStream(path.join(__dirname, 'src/assets/menu_flow.json')));
    await axios.post(`${API_URL}/${flowId}/assets`, formData, {
      headers: formData.getHeaders(),
      params: { access_token: ACCESS_TOKEN }
    });
    console.log('   Asset uploaded.');

    await axios.post(`${API_URL}/${flowId}`, {
      endpoint_uri: 'https://api.food.wayon.in/api/whatsapp/flow'
    }, { params: { access_token: ACCESS_TOKEN } });
    console.log('   Endpoint configured.');

    // ── Step 7: Publish ──
    console.log('[7/7] Publishing flow (Meta will ping our endpoint)...');
    await axios.post(`${API_URL}/${flowId}/publish`, {}, {
      params: { access_token: ACCESS_TOKEN }
    });
    console.log('');
    console.log('========================================');
    console.log('  FLOW PUBLISHED SUCCESSFULLY!');
    console.log(`  Flow ID: ${flowId}`);
    console.log('========================================');

    // Update MongoDB
    const { MongoClient } = require('mongodb');
    const client = new MongoClient('mongodb://localhost:27018/food-ordering?directConnection=true');
    await client.connect();
    await client.db('food-ordering').collection('restaurants').updateOne(
      { name: /Wayo/i },
      { $set: { whatsappFlowId: flowId } }
    );
    await client.close();
    console.log('Database updated with new flow ID.');

  } catch (error) {
    if (error.response) {
      console.error('FAILED:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error('FAILED:', error.message);
    }
    process.exit(1);
  }
}

main();
