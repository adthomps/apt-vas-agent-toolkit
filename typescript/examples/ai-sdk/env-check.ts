// Simple environment check for Visa Acceptance Agent Toolkit example
require('dotenv').config();

const required = [
  'VISA_ACCEPTANCE_MERCHANT_ID',
  'VISA_ACCEPTANCE_API_KEY_ID',
  'VISA_ACCEPTANCE_SECRET_KEY',
  'OPENAI_API_KEY',
];

const missing = required.filter((k) => !process.env[k] || String(process.env[k]).trim() === '');

const env = (process.env.VISA_ACCEPTANCE_ENVIRONMENT || 'SANDBOX').toUpperCase();
const runEnvironment = env === 'SANDBOX' ? 'apitest.cybersource.com' : 'api.cybersource.com';

console.log('Visa Acceptance environment:', env);
console.log('Visa Acceptance API host:', runEnvironment);
console.log('Merchant ID present:', Boolean(process.env.VISA_ACCEPTANCE_MERCHANT_ID));
console.log('API Key ID present:', Boolean(process.env.VISA_ACCEPTANCE_API_KEY_ID));
console.log('Secret Key present:', Boolean(process.env.VISA_ACCEPTANCE_SECRET_KEY));
console.log('OpenAI API Key present:', Boolean(process.env.OPENAI_API_KEY));

if (missing.length) {
  console.error('\nMissing required environment variables:', missing.join(', '));
  console.error('Please update your .env file.');
  process.exitCode = 1;
} else {
  console.log('\nEnvironment looks good. You can run: npm start');
}
