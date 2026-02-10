import express, { Request, Response } from 'express';
import { z } from 'zod';
import * as userService from '../services/userService';
import asyncHandler from '../utils/asyncHandler';
import env from '../config/env';

const router = express.Router();

const SignupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().optional()
});

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string()
});

router.post('/signup', asyncHandler(async (req: Request, res: Response) => {
  const validated = SignupSchema.parse(req.body);
  const result = await userService.signup(validated);
  res.status(201).json(result);
}));

router.post('/login', asyncHandler(async (req: Request, res: Response) => {
  const validated = LoginSchema.parse(req.body);
  const result = await userService.login(validated);
  res.json(result);
}));

router.get('/google', (req, res) => {
  res.json({ message: "Google Auth endpoint is working. Please use POST to authenticate.", method: req.method });
});

router.post('/google', asyncHandler(async (req: Request, res: Response) => {
  const { token } = req.body;
  if (!token) {
    console.error('[Auth Route] Missing token in request body');
    return res.status(400).json({ error: "Google token is required" });
  }

  try {
    const result = await userService.googleLogin(token);
    res.json(result);
  } catch (error: any) {
    console.error('[Auth Route] Google Login Error:', error);
    res.status(error.status || 500).json({ 
      error: error.message || "Authentication failed",
      details: env.nodeEnv === 'development' ? error.stack : undefined
    });
  }
}));

export default router;
