import express from 'express';
import auth from '../middleware/auth.js';
import prisma from '../config/prisma.js';
import asyncHandler from '../utils/asyncHandler.js';

const router = express.Router();

router.get('/', auth, asyncHandler(async (req, res) => {
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
      } catch (e) {
        console.error('Failed to parse report data:', e);
      }
    }
    return { ...report, fullReportData: data };
  });

  res.json(parsedReports);
}));

router.get('/:id', auth, asyncHandler(async (req, res) => {
  const report = await prisma.report.findFirst({
    where: { id: req.params.id, userId: req.user.id }
  });
  if (!report) return res.status(404).json({ error: "Report not found" });
  res.json(report);
}));

export default router;
