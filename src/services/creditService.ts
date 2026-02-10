import prisma from '../config/prisma';
import logger from '../utils/logger';

/**
 * Deducts a credit from a user's account with atomic transaction locking.
 */
export const useCredit = async (email: string) => {
  return await prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({ 
      where: { email },
      select: { id: true, email: true, credits: true, isPro: true }
    });

    if (!user) {
      const error = new Error("User account not found") as any;
      error.status = 404;
      throw error;
    }

    if (!user.isPro && user.credits <= 0) {
      const error = new Error("Insufficient credits. Please upgrade or purchase more.") as any;
      error.status = 402; // Payment Required
      throw error;
    }

    // Only decrement if not Pro
    if (!user.isPro) {
      const updatedUser = await tx.user.update({
        where: { id: user.id },
        data: { credits: { decrement: 1 } }
      });
      logger.info(`Credit used by ${email}. Remaining: ${updatedUser.credits}`);
      return updatedUser;
    }

    logger.info(`Pro user ${email} performing action (no credit deducted)`);
    return user;
  });
};

/**
 * Adds credits to a user's account.
 */
export const addCredits = async (email: string, amount: number) => {
  return await prisma.user.update({
    where: { email },
    data: { credits: { increment: amount } }
  });
};
