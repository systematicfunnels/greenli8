import express from 'express';
import * as stripeService from '../services/stripeService.js';
import logger from '../utils/logger.js';

const router = express.Router();

router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  try {
    const result = await stripeService.handleWebhook(req.body, sig);
    res.json(result);
  } catch (err) {
    logger.error('Webhook error:', err.message);
    res.status(400).send(`Webhook Error: ${err.message}`);
  }
});

export default router;
