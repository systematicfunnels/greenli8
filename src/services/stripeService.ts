import Stripe from 'stripe';
import env from '../config/env.js';
import prisma from '../config/prisma.js';
import logger from '../utils/logger.js';

const stripe = env.stripeSecretKey ? new Stripe(env.stripeSecretKey, {
  apiVersion: '2023-10-16' as any,
}) : null;

export const handleWebhook = async (rawBody: any, signature: string) => {
  if (!stripe || !env.stripeWebhookSecret) {
    throw new Error('Stripe not configured');
  }

  const event = stripe.webhooks.constructEvent(
    rawBody,
    signature,
    env.stripeWebhookSecret
  );

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    await processSuccessfulPayment(session);
  }

  return { received: true };
};

async function processSuccessfulPayment(session: Stripe.Checkout.Session) {
  const customerEmail = session.customer_details?.email;
  const planType = session.metadata?.plan || 'single';

  if (!customerEmail) {
    logger.warn('Payment missing customer email');
    return;
  }

  logger.info(`Processing payment for ${customerEmail}, plan: ${planType}`);

  let updateData: any = {};
  switch (planType) {
    case 'lifetime':
    case 'pro':
      updateData = { isPro: true };
      break;
    case 'maker':
      updateData = { credits: { increment: 10 } };
      break;
    default:
      updateData = { credits: { increment: 1 } };
  }

  await prisma.user.update({
    where: { email: customerEmail },
    data: updateData
  });

  logger.info(`Successfully updated user ${customerEmail} after payment`);
};
