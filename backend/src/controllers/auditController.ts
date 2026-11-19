import { Response } from 'express';
import prisma from '../prisma';
import { AuthRequest } from '../middleware/auth';

export const getAuditLogs = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { module, search, limit } = req.query;

    const where: any = {};
    if (module && module !== 'ALL') {
      where.module = module as string;
    }
    if (search && typeof search === 'string') {
      where.OR = [
        { action: { contains: search, mode: 'insensitive' } },
        { userName: { contains: search, mode: 'insensitive' } },
        { details: { contains: search, mode: 'insensitive' } },
        { module: { contains: search, mode: 'insensitive' } },
      ];
    }

    const logs = await prisma.auditLog.findMany({
      where,
      take: limit ? parseInt(limit as string) : 100,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, name: true, email: true, role: true } },
      },
    });

    res.json(logs);
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to fetch audit logs', error: error.message });
  }
};
