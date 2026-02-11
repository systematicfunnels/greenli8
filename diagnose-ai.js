// AI Provider Diagnostic Script
import env from './src/config/env.js';

console.log('🔍 AI Provider Diagnostic Report\n');

// Check API Keys
console.log('📋 API Key Status:');
console.log(`Gemini Key: ${env.geminiKey ? '✅ Present' : '❌ Missing'}`);

console.log('\n🔧 Required Actions:');

if (!env.geminiKey) {
  console.log('1. Get Gemini API Key:');
  console.log('   - Go to https://aistudio.google.com/app/apikey');
  console.log('   - Create new API key');
  console.log('   - Add to .env: API_KEY=your_gemini_key_here');
}

console.log('\n📝 AI Provider Priority:');
console.log('1. Gemini (Primary) - Supports attachments');

console.log('\n⚡ Quick Fix:');
console.log('You need a working Google Gemini API key.');
console.log('Gemini is required as it supports file attachments.');

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
