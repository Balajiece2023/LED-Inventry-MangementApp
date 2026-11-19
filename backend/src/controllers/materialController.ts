import { Response } from 'express';
import { TransactionType, NotificationType, Role } from '@prisma/client';
import prisma from '../prisma';
import { AuthRequest } from '../middleware/auth';
import { logAudit, createNotification } from '../services/auditService';

export const getMaterials = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { search, category, lowStock } = req.query;

    const where: any = {};
    if (category && category !== 'ALL') {
      where.category = category as string;
    }
    if (search && typeof search === 'string') {
      where.OR = [
        { materialCode: { contains: search, mode: 'insensitive' } },
        { materialName: { contains: search, mode: 'insensitive' } },
        { category: { contains: search, mode: 'insensitive' } },
        { supplier: { contains: search, mode: 'insensitive' } },
      ];
    }

    const materials = await prisma.material.findMany({
      where,
      orderBy: { materialName: 'asc' },
    });

    // Calculate available stock and low stock flag
    const formatted = materials.map((m) => {
      const availableStock = Math.max(0, m.currentStock - m.reservedStock);
      const isLowStock = availableStock <= m.reorderLevel;
      const totalValue = Number((m.currentStock * m.unitCost).toFixed(2));
      return {
        ...m,
        availableStock,
        isLowStock,
        totalValue,
      };
    });

    const result = lowStock === 'true' ? formatted.filter((m) => m.isLowStock) : formatted;

    res.json(result);
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to fetch materials', error: error.message });
  }
};

export const getMaterialById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const material = await prisma.material.findUnique({
      where: { id },
      include: {
        inventoryTransactions: {
          take: 50,
          orderBy: { createdAt: 'desc' },
          include: { createdBy: { select: { id: true, name: true, role: true } } },
        },
        bomItems: {
          include: {
            bom: {
              include: { product: true },
            },
          },
        },
      },
    });

    if (!material) {
      res.status(404).json({ message: 'Material not found.' });
      return;
    }

    const availableStock = Math.max(0, material.currentStock - material.reservedStock);
    const isLowStock = availableStock <= material.reorderLevel;

    res.json({
      ...material,
      availableStock,
      isLowStock,
      totalValue: Number((material.currentStock * material.unitCost).toFixed(2)),
    });
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to fetch material details', error: error.message });
  }
};

export const createMaterial = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { materialCode, materialName, category, currentStock, unit, unitCost, reorderLevel, supplier } = req.body;

    if (!materialCode || !materialName || !category || !unit) {
      res.status(400).json({ message: 'Code, name, category, and unit are required.' });
      return;
    }

    const existing = await prisma.material.findUnique({
      where: { materialCode: materialCode.trim().toUpperCase() },
    });

    if (existing) {
      res.status(400).json({ message: `Material code ${materialCode} already exists.` });
      return;
    }

    const initialStock = parseFloat(currentStock || '0');
    const material = await prisma.material.create({
      data: {
        materialCode: materialCode.trim().toUpperCase(),
        materialName: materialName.trim(),
        category: category.trim(),
        currentStock: initialStock,
        reservedStock: 0,
        unit: unit.trim().toUpperCase(),
        unitCost: parseFloat(unitCost || '0'),
        reorderLevel: parseFloat(reorderLevel || '100'),
        supplier: supplier?.trim() || null,
      },
    });

    if (initialStock > 0) {
      await prisma.inventoryTransaction.create({
        data: {
          materialId: material.id,
          transactionType: TransactionType.INWARD,
          quantity: initialStock,
          previousStock: 0,
          newStock: initialStock,
          referenceType: 'OPENING_BALANCE',
          notes: 'Initial inventory creation',
          createdById: req.user?.id,
        },
      });
    }

    await logAudit(
      req.user?.id,
      req.user?.name || 'User',
      'MATERIAL_CREATED',
      'Inventory',
      `Created material ${material.materialCode} with stock ${initialStock}`,
      req.ip
    );

    res.status(201).json(material);
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to create material', error: error.message });
  }
};

export const updateMaterial = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { materialName, category, unit, unitCost, reorderLevel, supplier } = req.body;

    const existing = await prisma.material.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ message: 'Material not found.' });
      return;
    }

    const updated = await prisma.material.update({
      where: { id },
      data: {
        materialName: materialName ? materialName.trim() : existing.materialName,
        category: category ? category.trim() : existing.category,
        unit: unit ? unit.trim().toUpperCase() : existing.unit,
        unitCost: unitCost !== undefined ? parseFloat(unitCost) : existing.unitCost,
        reorderLevel: reorderLevel !== undefined ? parseFloat(reorderLevel) : existing.reorderLevel,
        supplier: supplier !== undefined ? supplier?.trim() : existing.supplier,
      },
    });

    await logAudit(
      req.user?.id,
      req.user?.name || 'User',
      'MATERIAL_UPDATED',
      'Inventory',
      `Updated material ${updated.materialCode}`,
      req.ip
    );

    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to update material', error: error.message });
  }
};

export const addStock = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { quantity, referenceNumber, supplier, notes } = req.body;

    const qty = parseFloat(quantity);
    if (!qty || qty <= 0) {
      res.status(400).json({ message: 'Please provide a valid quantity greater than 0.' });
      return;
    }

    const material = await prisma.material.findUnique({ where: { id } });
    if (!material) {
      res.status(404).json({ message: 'Material not found.' });
      return;
    }

    const previousStock = material.currentStock;
    const newStock = previousStock + qty;

    const updatedMaterial = await prisma.material.update({
      where: { id },
      data: {
        currentStock: newStock,
        supplier: supplier ? supplier.trim() : material.supplier,
      },
    });

    await prisma.inventoryTransaction.create({
      data: {
        materialId: material.id,
        transactionType: TransactionType.INWARD,
        quantity: qty,
        previousStock,
        newStock,
        referenceType: 'GOODS_RECEIPT_NOTE',
        referenceId: referenceNumber || null,
        notes: notes || `Stock inward of ${qty} ${material.unit}`,
        createdById: req.user?.id,
      },
    });

    await logAudit(
      req.user?.id,
      req.user?.name || 'User',
      'MATERIAL_ADDED',
      'Inventory',
      `Added ${qty} ${material.unit} to ${material.materialCode}. Ref: ${referenceNumber || 'N/A'}`,
      req.ip
    );

    res.json({
      message: `Successfully added ${qty} ${material.unit} to stock.`,
      material: updatedMaterial,
    });
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to add stock', error: error.message });
  }
};

export const adjustStock = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { newCurrentStock, reason } = req.body;

    if (newCurrentStock === undefined || parseFloat(newCurrentStock) < 0) {
      res.status(400).json({ message: 'Valid non-negative stock count is required.' });
      return;
    }

    const targetStock = parseFloat(newCurrentStock);
    const material = await prisma.material.findUnique({ where: { id } });
    if (!material) {
      res.status(404).json({ message: 'Material not found.' });
      return;
    }

    const diff = targetStock - material.currentStock;
    const previousStock = material.currentStock;

    const updated = await prisma.material.update({
      where: { id },
      data: { currentStock: targetStock },
    });

    await prisma.inventoryTransaction.create({
      data: {
        materialId: material.id,
        transactionType: TransactionType.ADJUSTMENT,
        quantity: diff,
        previousStock,
        newStock: targetStock,
        referenceType: 'MANUAL_AUDIT_ADJUSTMENT',
        notes: reason || 'Inventory physical count adjustment',
        createdById: req.user?.id,
      },
    });

    // Check if new stock triggered low stock alert
    const available = targetStock - material.reservedStock;
    if (available <= material.reorderLevel) {
      await createNotification(
        'Low Stock Alert',
        `${material.materialCode} (${material.materialName}) has fallen to ${targetStock} ${material.unit} (Reorder level: ${material.reorderLevel})`,
        NotificationType.LOW_STOCK,
        Role.STORE_KEEPER,
        '/materials'
      );
    }

    await logAudit(
      req.user?.id,
      req.user?.name || 'User',
      'STOCK_ADJUSTED',
      'Inventory',
      `Adjusted ${material.materialCode} from ${previousStock} to ${targetStock}. Reason: ${reason || 'Physical count'}`,
      req.ip
    );

    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to adjust stock', error: error.message });
  }
};

export const getTransactions = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { materialId, type, limit } = req.query;

    const where: any = {};
    if (materialId) where.materialId = materialId as string;
    if (type && type !== 'ALL') where.transactionType = type as TransactionType;

    const transactions = await prisma.inventoryTransaction.findMany({
      where,
      take: limit ? parseInt(limit as string) : 100,
      orderBy: { createdAt: 'desc' },
      include: {
        material: { select: { materialCode: true, materialName: true, unit: true } },
        createdBy: { select: { id: true, name: true, role: true } },
      },
    });

    res.json(transactions);
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to fetch inventory transactions', error: error.message });
  }
};
