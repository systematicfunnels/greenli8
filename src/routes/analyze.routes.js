import express from 'express';
import { z } from 'zod';
import auth from '../middleware/auth.js';
import prisma from '../config/prisma.js';
import { analyzeIdea, chatWithAI } from '../services/aiService.js';
import { useCredit } from '../services/creditService.js';
import asyncHandler from '../utils/asyncHandler.js';

const router = express.Router();

const AnalysisSchema = z.object({
  idea: z.string().min(1).max(10000),
  attachment: z.object({
    mimeType: z.string(),
    data: z.string()
  }).optional()
});

router.post('/analyze', auth, asyncHandler(async (req, res) => {
  const { idea, attachment } = AnalysisSchema.parse(req.body);
  
  // 1. Lock credits
  const user = await useCredit(req.user.email);

  // 2. Run AI Analysis
  const result = await analyzeIdea(idea, attachment);

  // 3. Save report
  await prisma.report.create({
    data: {
      userId: user.id,
      originalIdea: idea,
      summaryVerdict: result.summaryVerdict,
      viabilityScore: result.viabilityScore,
      fullReportData: result
    }
  });

  res.json(result);
}));

router.post('/chat', auth, asyncHandler(async (req, res) => {
  const { message, context } = req.body;
  if (!message || !context) return res.status(400).json({ error: "Message and context required" });
  
  const text = await chatWithAI(message, context);
  res.json({ text });
}));

export default router;
