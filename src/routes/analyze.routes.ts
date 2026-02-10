import express, { Response } from 'express';
import { z } from 'zod';
import auth, { AuthRequest } from '../middleware/auth.ts';
import prisma from '../config/prisma.ts';
import { analyzeIdea, chatWithAI } from '../services/aiService.ts';
import { useCredit } from '../services/creditService.ts';
import asyncHandler from '../utils/asyncHandler.ts';

const router = express.Router();

const AnalysisSchema = z.object({
  idea: z.string().min(1).max(10000),
  attachment: z.object({
    mimeType: z.string(),
    data: z.string()
  }).optional()
});

router.post('/analyze', auth, asyncHandler(async (req: AuthRequest, res: Response) => {
  const { idea, attachment } = AnalysisSchema.parse(req.body);
  
  if (!req.user?.email) return res.status(401).json({ error: "User not authenticated" });

  // 1. Lock credits
  const user = await useCredit(req.user.email);

  // 2. Run AI Analysis
  const result = await analyzeIdea(idea, attachment as any);

  // 3. Save report
  await prisma.report.create({
    data: {
      userId: user.id,
      originalIdea: idea,
      summaryVerdict: result.summaryVerdict,
      viabilityScore: result.viabilityScore,
      oneLineTakeaway: result.oneLineTakeaway || '',
      marketReality: result.marketReality || '',
      fullReportData: result
    }
  });

  res.json(result);
}));

router.post('/chat', auth, asyncHandler(async (req: AuthRequest, res: Response) => {
  const { message, context } = req.body;
  if (!message || !context) return res.status(400).json({ error: "Message and context required" });
  
  const text = await chatWithAI(message, context);
  res.json({ text });
}));

export default router;
