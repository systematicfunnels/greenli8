import express, { Response } from 'express';
import auth, { AuthRequest } from '../middleware/auth.js';
import prisma from '../config/prisma.js';
import asyncHandler from '../utils/asyncHandler.js';

const router = express.Router();

router.get('/', auth, asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user?.id) return res.status(401).json({ error: "User not authenticated" });

  const reports = await prisma.report.findMany({
    where: { userId: req.user.id },
    orderBy: { createdAt: 'desc' }
  });
  
  // Robust JSON parsing for fullReportData
  const parsedReports = reports.map(report => {
    let data = report.fullReportData;
    if (typeof data === 'string') {
      try {
        data = JSON.parse(data);
      } catch (_e) {
        console.error('Failed to parse report data:', _e);
      }
    }
    return { ...report, fullReportData: data };
  });

  res.json(parsedReports);
}));

router.get('/:id', auth, asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user?.id) return res.status(401).json({ error: "User not authenticated" });

  const report = await prisma.report.findFirst({
    where: { id: req.params.id as string, userId: req.user.id }
  });
  if (!report) return res.status(404).json({ error: "Report not found" });

  // Robust JSON parsing for fullReportData
  let data = report.fullReportData;
  if (typeof data === 'string') {
    try {
      data = JSON.parse(data);
    } catch (_e) {
      console.error('Failed to parse report data:', _e);
    }
  }

  res.json({ ...report, fullReportData: data });
}));

export default router;
