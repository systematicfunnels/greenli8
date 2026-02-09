
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function main() {
  console.log('Testing Prisma Waitlist connection...');
  console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'Defined' : 'Undefined');

  try {
    const email = `test-${Date.now()}@example.com`;
    console.log(`Attempting to upsert email: ${email}`);

    const entry = await prisma.waitlist.upsert({
      where: { email },
      update: { source: 'debug_script' }, 
      create: { email, source: 'debug_script' }
    });

    console.log('✅ Success! Entry created/updated:', entry);
  } catch (error) {
    console.error('❌ Error accessing Waitlist table:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
