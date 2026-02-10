import express from 'express';
import { z } from 'zod';
import auth from '../middleware/auth.js';
import * as userService from '../services/userService.js';
import asyncHandler from '../utils/asyncHandler.js';

const router = express.Router();

const ProfileUpdateSchema = z.object({
  name: z.string().min(2).max(50).optional(),
  preferences: z.object({
    emailNotifications: z.boolean().optional(),
    marketingEmails: z.boolean().optional(),
    theme: z.enum(['light', 'dark']).optional()
  }).optional()
}).strict();

router.get('/me', auth, asyncHandler(async (req, res) => {
  const user = await userService.getCurrentUser(req.user.email);
  res.json(user);
}));

router.put('/profile', auth, asyncHandler(async (req, res) => {
  const validated = ProfileUpdateSchema.parse(req.body);
  const user = await userService.updateProfile(req.user.email, validated);
  res.json(user);
}));

router.delete('/me', auth, asyncHandler(async (req, res) => {
  await userService.deleteAccount(req.user.email);
  res.status(204).end();
}));

export default router;
