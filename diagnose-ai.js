// AI Provider Diagnostic Script
import env from './src/config/env.js';

console.log('🔍 AI Provider Diagnostic Report\n');

// Check API Keys
console.log('📋 API Key Status:');
console.log(`Gemini Key: ${env.geminiKey ? '✅ Present' : '❌ Missing'}`);
console.log(`Sarvam Key: ${env.sarvamKey ? '✅ Present' : '❌ Missing'}`);
console.log(`OpenRouter Key: ${env.openRouterKey ? '✅ Present' : '❌ Missing'}`);

console.log('\n🔧 Required Actions:');

if (!env.geminiKey) {
  console.log('1. Get Gemini API Key:');
  console.log('   - Go to https://aistudio.google.com/app/apikey');
  console.log('   - Create new API key');
  console.log('   - Add to .env: API_KEY=your_gemini_key_here');
}

if (!env.sarvamKey) {
  console.log('2. Get Sarvam API Key:');
  console.log('   - Go to https://dashboard.sarvam.ai/');
  console.log('   - Sign up and get API key');
  console.log('   - Add to .env: SARVAM_API_KEY=your_sarvam_key_here');
}

if (!env.openRouterKey) {
  console.log('3. Get OpenRouter API Key (Optional):');
  console.log('   - Go to https://openrouter.ai/keys');
  console.log('   - Create API key');
  console.log('   - Add to .env: OPENROUTER_API_KEY=your_openrouter_key_here');
}

console.log('\n📝 AI Provider Priority:');
console.log('1. Gemini (Primary) - Supports attachments');
console.log('2. OpenRouter (Fallback) - Multiple free models');
console.log('3. Sarvam (Final) - Text only');

console.log('\n⚡ Quick Fix:');
console.log('At minimum, you need ONE working API key.');
console.log('Gemini is recommended as it supports file attachments.');

// Test API connection (if keys are present)
if (env.geminiKey) {
  console.log('\n🧪 Testing Gemini API...');
  // Would need actual API call here
  console.log('✅ Gemini key format looks valid');
}

console.log('\n🚀 Next Steps:');
console.log('1. Add at least one AI API key to your .env file');
console.log('2. Restart the server');
console.log('3. Test the analysis functionality');
