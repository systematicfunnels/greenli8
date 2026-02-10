import express, { Request, Response } from 'express';
import * as stripeService from '../services/stripeService';
import logger from '../utils/logger';

const router = express.Router();

router.post('/webhook', express.raw({ type: 'application/json' }), async (req: Request, res: Response) => {
  const sig = req.headers['stripe-signature'] as string;
  try {
    const result = await stripeService.handleWebhook(req.body, sig);
    res.json(result);
  } catch (err: any) {
    logger.error('Webhook error:', err.message);
    res.status(400).send(`Webhook Error: ${err.message}`);
  }
});

export default router;
