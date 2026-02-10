import { PrismaClient } from '@prisma/client';
import prisma from './src/config/prisma.ts';

async function addCredits() {
  const email = process.argv[2]; // Get email from command line
  
  if (!email) {
    console.log('Usage: node add-credits.js <your-email@example.com>');
    process.exit(1);
  }
  
  try {
    const user = await prisma.user.findUnique({ 
      where: { email },
      select: { id: true, email: true, credits: true, isPro: true }
    });
    
    if (!user) {
      console.log('User not found:', email);
      process.exit(1);
    }
    
    const updatedUser = await prisma.user.update({
      where: { email },
      data: { credits: { increment: 20 } } // Add 20 credits
    });
    
    console.log(`✅ Added 20 credits to ${email}. New balance: ${updatedUser.credits + 20}`);
    
  } catch (error) {
    console.error('Error adding credits:', error);
  } finally {
    await prisma.$disconnect();
  }
}

addCredits();
