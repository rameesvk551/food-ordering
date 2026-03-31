const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '.env');
const keyPath = path.join(__dirname, 'key.b64');

try {
  const keyMatch = fs.readFileSync(keyPath, 'utf8').trim();
  let envContent = fs.readFileSync(envPath, 'utf8');

  // Handle both newline and non-newline endings
  if (envContent.includes('WHATSAPP_FLOW_PRIVATE_KEY=')) {
    envContent = envContent.replace(/^WHATSAPP_FLOW_PRIVATE_KEY=.*/m, `WHATSAPP_FLOW_PRIVATE_KEY=${keyMatch}`);
  } else {
    envContent += `\nWHATSAPP_FLOW_PRIVATE_KEY=${keyMatch}\n`;
  }

  fs.writeFileSync(envPath, envContent);
  console.log('--- ENV UPDATED SUCCESSFULLY ---');
} catch (error) {
  console.error('Failed to update env:', error.message);
  process.exit(1);
}
