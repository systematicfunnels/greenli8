import express, { Request, Response } from 'express';
import { z } from 'zod';
import * as userService from '../services/userService';
import asyncHandler from '../utils/asyncHandler';

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
  if (!token) return res.status(400).json({ error: "Google token required" });
  const result = await userService.googleLogin(token);
  res.json(result);
}));

export default router;
