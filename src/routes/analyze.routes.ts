import express, { Response } from 'express';
import { z } from 'zod';
import auth, { AuthRequest } from '../middleware/auth.js';
import prisma from '../config/prisma.js';
import { analyzeIdea, chatWithAI } from '../services/aiService.js';
import { useCredit, addCredits } from '../services/creditService.js';
import asyncHandler from '../utils/asyncHandler.js';

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

  let creditDeducted = false;
  let user;

  try {
    // 1. Deduct credit first (atomic)
    user = await useCredit(req.user.email);
    creditDeducted = true;

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
  } catch (error: any) {
    // 4. Refund credit if deduction happened but AI/Save failed
    if (creditDeducted && req.user?.email) {
      try {
        await addCredits(req.user.email, 1);
        console.log(`[Credits] Refunded 1 credit to ${req.user.email} due to failure`);
      } catch (refundError) {
        console.error(`[Credits] FAILED TO REFUND ${req.user.email}:`, refundError);
      }
    }
    
    // Pass error to errorHandler middleware
    throw error;
  }
}));

router.post('/chat', auth, asyncHandler(async (req: AuthRequest, res: Response) => {
  const { message, context } = req.body;
  if (!message || !context) return res.status(400).json({ error: "Message and context required" });
  
  const text = await chatWithAI(message, context);
  res.json({ text });
}));

export default router;
