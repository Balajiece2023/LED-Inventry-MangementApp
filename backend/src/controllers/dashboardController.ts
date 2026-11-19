import { Response } from 'express';
import { OrderStatus, QCResult, DispatchStatus, Role } from '@prisma/client';
import prisma from '../prisma';
import { AuthRequest } from '../middleware/auth';

export const getDashboardStats = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userRole = req.user?.role || Role.ADMIN;

    // 1. Core counts
    const [
      totalProducts,
      materials,
      productionOrders,
      qcReports,
      finishedGoods,
      dispatchOrders,
    ] = await Promise.all([
      prisma.product.count(),
      prisma.material.findMany(),
      prisma.productionOrder.findMany({
        include: { product: true },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.qCReport.findMany({
        orderBy: { createdAt: 'desc' },
      }),
      prisma.finishedGoods.findMany({
        include: { product: true },
      }),
      prisma.dispatchOrder.findMany({
        include: { product: true },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    // Raw Materials calculations
    const rawMaterialCount = materials.length;
    const inventoryValue = materials.reduce((sum, m) => sum + m.currentStock * m.unitCost, 0);
    const lowStockMaterials = materials.filter((m) => (m.currentStock - m.reservedStock) <= m.reorderLevel);

    // QC Calculations
    const totalQC = qcReports.length;
    const passCount = qcReports.filter((r) => r.result === QCResult.PASS).length;
    const failCount = qcReports.filter((r) => r.result === QCResult.FAIL).length;
    const qcPassPercent = totalQC > 0 ? Number(((passCount / totalQC) * 100).toFixed(1)) : 100;
    const qcFailPercent = totalQC > 0 ? Number(((failCount / totalQC) * 100).toFixed(1)) : 0;

    // Production Orders breakdown
    const totalOrders = productionOrders.length;
    const completedOrders = productionOrders.filter((o) => o.status === OrderStatus.COMPLETED).length;
    const inProgressOrders = productionOrders.filter((o) => o.status === OrderStatus.IN_PROGRESS).length;
    const lockedOrders = productionOrders.filter((o) => o.status === OrderStatus.LOCKED).length;
    const draftOrders = productionOrders.filter((o) => o.status === OrderStatus.DRAFT).length;

    // Today's production
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayOrders = productionOrders.filter((o) => new Date(o.productionDate) >= today);
    const todayProductionUnits = todayOrders.reduce((sum, o) => sum + o.quantity, 0);

    // Finished Goods
    const totalFGQuantity = finishedGoods.reduce((sum, f) => sum + f.quantity, 0);
    const availableFGQuantity = finishedGoods.reduce((sum, f) => sum + (f.quantity - f.reservedQuantity), 0);

    // Dispatch
    const pendingDispatchCount = dispatchOrders.filter((d) => d.status === DispatchStatus.PENDING).length;
    const completedDispatchCount = dispatchOrders.filter((d) => d.status === DispatchStatus.DISPATCHED).length;

    // Recent activity
    const recentOrders = productionOrders.slice(0, 5);
    const recentQC = qcReports.slice(0, 5);
    const recentDispatch = dispatchOrders.slice(0, 5);

    // Role-specific customized summary payload
    res.json({
      role: userRole,
      summary: {
        totalProducts,
        rawMaterialsCount: rawMaterialCount,
        inventoryValue: Number(inventoryValue.toFixed(2)),
        lowStockCount: lowStockMaterials.length,
        totalProductionOrders: totalOrders,
        completedOrders,
        inProgressOrders,
        lockedOrders,
        draftOrders,
        todayProductionUnits,
        totalQCTests: totalQC,
        qcPassCount: passCount,
        qcFailCount: failCount,
        qcPassPercent,
        qcFailPercent,
        totalFGQuantity,
        availableFGQuantity,
        pendingDispatchCount,
        completedDispatchCount,
      },
      lowStockMaterials: lowStockMaterials.slice(0, 5),
      recentOrders,
      recentQC,
      recentDispatch,
    });
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to fetch dashboard stats', error: error.message });
  }
};
