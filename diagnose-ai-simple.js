console.log('🔍 AI Provider Diagnostic Report\n');

// Check environment variables directly
console.log('📋 API Key Status:');
console.log(`Gemini Key: ${process.env.API_KEY || process.env.GEMINI_API_KEY ? '✅ Present' : '❌ Missing'}`);
console.log(`Sarvam Key: ${process.env.SARVAM_API_KEY ? '✅ Present' : '❌ Missing'}`);
console.log(`OpenRouter Key: ${process.env.OPENROUTER_API_KEY ? '✅ Present' : '❌ Missing'}`);

console.log('\n🔧 Required Actions:');

if (!process.env.API_KEY && !process.env.GEMINI_API_KEY) {
  console.log('1. Get Gemini API Key:');
  console.log('   - Go to https://aistudio.google.com/app/apikey');
  console.log('   - Create new API key');
  console.log('   - Add to .env: API_KEY=your_gemini_key_here');
}

if (!process.env.SARVAM_API_KEY) {
  console.log('2. Get Sarvam API Key:');
  console.log('   - Go to https://dashboard.sarvam.ai/');
  console.log('   - Sign up and get API key');
  console.log('   - Add to .env: SARVAM_API_KEY=your_sarvam_key_here');
}

if (!process.env.OPENROUTER_API_KEY) {
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

console.log('\n🚀 Next Steps:');
console.log('1. Add at least one AI API key to your .env file');
console.log('2. Restart the server');
console.log('3. Test the analysis functionality');

console.log('\n🌐 Current Environment:');
console.log(`NODE_ENV: ${process.env.NODE_ENV || 'not set'}`);
console.log(`PORT: ${process.env.PORT || 'not set'}`);
console.log(`DATABASE_URL: ${process.env.DATABASE_URL ? '✅ Set' : '❌ Missing'}`);
console.log(`JWT_SECRET: ${process.env.JWT_SECRET ? '✅ Set' : '❌ Missing'}`);
console.log(`STRIPE_SECRET_KEY: ${process.env.STRIPE_SECRET_KEY ? '✅ Set' : '❌ Missing'}`);
