console.log('🔍 AI Provider Diagnostic Report\n');

// Check environment variables directly
console.log('📋 API Key Status:');
console.log(`Gemini Key: ${process.env.API_KEY || process.env.GEMINI_API_KEY ? '✅ Present' : '❌ Missing'}`);

console.log('\n🔧 Required Actions:');

if (!process.env.API_KEY && !process.env.GEMINI_API_KEY) {
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
