import { Response } from 'express';
import { QCResult } from '@prisma/client';
import prisma from '../prisma';
import { AuthRequest } from '../middleware/auth';

export const getFinishedGoods = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { productId, search } = req.query;

    const where: any = {};
    if (productId) {
      where.productId = productId as string;
    }
    if (search && typeof search === 'string') {
      where.OR = [
        { batchNumber: { contains: search, mode: 'insensitive' } },
        { product: { modelNumber: { contains: search, mode: 'insensitive' } } },
        { product: { productName: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const items = await prisma.finishedGoods.findMany({
      where,
      include: {
        product: { select: { id: true, modelNumber: true, productName: true, wattage: true } },
      },
      orderBy: { manufacturingDate: 'desc' },
    });

    const formatted = items.map((item) => {
      const availableQuantity = Math.max(0, item.quantity - item.reservedQuantity);
      return {
        ...item,
        availableQuantity,
      };
    });

    res.json(formatted);
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to fetch finished goods', error: error.message });
  }
};

export const getFinishedGoodsStats = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const items = await prisma.finishedGoods.findMany();

    const totalQuantity = items.reduce((sum, it) => sum + it.quantity, 0);
    const totalReserved = items.reduce((sum, it) => sum + it.reservedQuantity, 0);
    const totalAvailable = Math.max(0, totalQuantity - totalReserved);

    // Get count of rejected QC reports
    const rejectedBatches = await prisma.qCReport.count({
      where: { result: QCResult.FAIL },
    });

    res.json({
      totalQuantity,
      totalReserved,
      totalAvailable,
      rejectedBatches,
      batchCount: items.length,
    });
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to fetch finished goods stats', error: error.message });
  }
};
