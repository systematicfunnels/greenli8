import express, { Response } from 'express';
import { z } from 'zod';
import auth, { AuthRequest } from '../middleware/auth.ts';
import * as userService from '../services/userService.ts';
import asyncHandler from '../utils/asyncHandler.ts';

const router = express.Router();

const ProfileUpdateSchema = z.object({
  name: z.string().min(2).max(50).optional(),
  preferences: z.object({
    emailNotifications: z.boolean().optional(),
    marketingEmails: z.boolean().optional(),
    theme: z.enum(['light', 'dark']).optional()
  }).optional()
}).strict();

router.get('/me', auth, asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user?.email) return res.status(401).json({ error: "User not authenticated" });
  const user = await userService.getCurrentUser(req.user.email);
  res.json(user);
}));

router.put('/profile', auth, asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user?.email) return res.status(401).json({ error: "User not authenticated" });
  const validated = ProfileUpdateSchema.parse(req.body);
  const user = await userService.updateProfile(req.user.email, validated);
  res.json(user);
}));

router.delete('/me', auth, asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user?.email) return res.status(401).json({ error: "User not authenticated" });
  await userService.deleteAccount(req.user.email);
  res.status(204).end();
}));

export default router;
