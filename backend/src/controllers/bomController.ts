import { Response } from 'express';
import prisma from '../prisma';
import { AuthRequest } from '../middleware/auth';
import { logAudit } from '../services/auditService';

export const getBOMs = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { productId } = req.query;

    const where: any = {};
    if (productId) {
      where.productId = productId as string;
    }

    const boms = await prisma.bOM.findMany({
      where,
      include: {
        product: { select: { id: true, modelNumber: true, productName: true, wattage: true } },
        items: {
          include: {
            material: {
              select: {
                id: true,
                materialCode: true,
                materialName: true,
                category: true,
                unit: true,
                unitCost: true,
                currentStock: true,
                reservedStock: true,
              },
            },
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    res.json(boms);
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to fetch BOMs', error: error.message });
  }
};

export const getBOMById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const bom = await prisma.bOM.findUnique({
      where: { id },
      include: {
        product: true,
        items: {
          include: {
            material: true,
          },
        },
      },
    });

    if (!bom) {
      res.status(404).json({ message: 'BOM not found' });
      return;
    }

    res.json(bom);
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to fetch BOM', error: error.message });
  }
};

export const getActiveBOMForProduct = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { productId } = req.params;
    const { quantity } = req.query;

    const qty = quantity ? parseFloat(quantity as string) : 1;

    const bom = await prisma.bOM.findFirst({
      where: {
        productId,
        status: 'ACTIVE',
      },
      include: {
        product: true,
        items: {
          include: {
            material: true,
          },
        },
      },
      orderBy: { version: 'desc' },
    });

    if (!bom) {
      res.status(404).json({ message: 'No active BOM found for this product.' });
      return;
    }

    // Calculate required, available, and shortages for the requested quantity
    const itemsWithCalculations = bom.items.map((item) => {
      const requiredQuantity = item.quantityRequired * qty;
      const availableStock = Math.max(0, item.material.currentStock - item.material.reservedStock);
      const shortageQuantity = Math.max(0, requiredQuantity - availableStock);
      const isShortage = shortageQuantity > 0;
      const estimatedCost = Number((requiredQuantity * item.material.unitCost).toFixed(2));

      return {
        id: item.id,
        materialId: item.materialId,
        materialCode: item.material.materialCode,
        materialName: item.material.materialName,
        category: item.material.category,
        unit: item.material.unit,
        unitCost: item.material.unitCost,
        currentStock: item.material.currentStock,
        reservedStock: item.material.reservedStock,
        availableStock,
        quantityPerUnit: item.quantityRequired,
        requiredQuantity,
        shortageQuantity,
        isShortage,
        estimatedCost,
      };
    });

    const totalEstimatedCost = itemsWithCalculations.reduce((sum, item) => sum + item.estimatedCost, 0);
    const hasAnyShortage = itemsWithCalculations.some((item) => item.isShortage);

    res.json({
      bomId: bom.id,
      version: bom.version,
      status: bom.status,
      product: bom.product,
      productionQuantity: qty,
      hasAnyShortage,
      totalEstimatedCost: Number(totalEstimatedCost.toFixed(2)),
      materials: itemsWithCalculations,
    });
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to calculate BOM requirements', error: error.message });
  }
};

export const createBOM = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { productId, version, notes, items } = req.body;

    if (!productId || !items || !Array.isArray(items) || items.length === 0) {
      res.status(400).json({ message: 'Product and at least one BOM item are required.' });
      return;
    }

    const bomVersion = version?.trim() || '1.0';

    const existing = await prisma.bOM.findUnique({
      where: {
        productId_version: {
          productId,
          version: bomVersion,
        },
      },
    });

    if (existing) {
      res.status(400).json({
        message: `BOM version ${bomVersion} already exists for this product. Use a new version number (e.g. 1.1 or 2.0).`,
      });
      return;
    }

    const bom = await prisma.bOM.create({
      data: {
        productId,
        version: bomVersion,
        status: 'ACTIVE',
        notes: notes?.trim() || null,
        items: {
          create: items.map((item: any) => ({
            materialId: item.materialId,
            quantityRequired: parseFloat(item.quantityRequired),
          })),
        },
      },
      include: {
        product: true,
        items: { include: { material: true } },
      },
    });

    await logAudit(
      req.user?.id,
      req.user?.name || 'User',
      'BOM_CREATED',
      'BOM Management',
      `Created BOM v${bom.version} for product ${bom.product.modelNumber} with ${bom.items.length} materials.`,
      req.ip
    );

    res.status(201).json(bom);
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to create BOM', error: error.message });
  }
};

export const updateBOM = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { notes, status, items } = req.body;

    const existing = await prisma.bOM.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ message: 'BOM not found' });
      return;
    }

    // Update transaction
    const updated = await prisma.$transaction(async (tx) => {
      if (items && Array.isArray(items)) {
        await tx.bOMItem.deleteMany({ where: { bomId: id } });
        await tx.bOMItem.createMany({
          data: items.map((it: any) => ({
            bomId: id,
            materialId: it.materialId,
            quantityRequired: parseFloat(it.quantityRequired),
          })),
        });
      }

      return tx.bOM.update({
        where: { id },
        data: {
          notes: notes !== undefined ? notes?.trim() : existing.notes,
          status: status || existing.status,
        },
        include: {
          product: true,
          items: { include: { material: true } },
        },
      });
    });

    await logAudit(
      req.user?.id,
      req.user?.name || 'User',
      'BOM_UPDATED',
      'BOM Management',
      `Updated BOM v${updated.version} for ${updated.product.modelNumber}`,
      req.ip
    );

    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to update BOM', error: error.message });
  }
};
