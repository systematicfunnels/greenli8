import express from 'express';
import { z } from 'zod';
import * as userService from '../services/userService.js';
import asyncHandler from '../utils/asyncHandler.js';

import prisma from '../config/prisma.js';

const router = express.Router();

const WaitlistSchema = z.object({
  email: z.string().email(),
  source: z.string().optional()
});

const SignupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().optional()
});

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string()
});

router.post('/signup', asyncHandler(async (req, res) => {
  const validated = SignupSchema.parse(req.body);
  const result = await userService.signup(validated);
  res.status(201).json(result);
}));

router.post('/login', asyncHandler(async (req, res) => {
  const validated = LoginSchema.parse(req.body);
  const result = await userService.login(validated);
  res.json(result);
}));

router.post('/google', asyncHandler(async (req, res) => {
  const { token } = req.body;
  if (!token) return res.status(400).json({ error: "Google token required" });
  const result = await userService.googleLogin(token);
  res.json(result);
}));

export default router;
