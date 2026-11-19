import { Response } from 'express';
import { ProductStatus } from '@prisma/client';
import prisma from '../prisma';
import { AuthRequest } from '../middleware/auth';
import { logAudit } from '../services/auditService';

export const getProducts = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { search, status } = req.query;

    const where: any = {};
    if (status && status !== 'ALL') {
      where.status = status as ProductStatus;
    }
    if (search && typeof search === 'string') {
      where.OR = [
        { modelNumber: { contains: search, mode: 'insensitive' } },
        { productName: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const products = await prisma.product.findMany({
      where,
      include: {
        boms: {
          select: { id: true, version: true, status: true, _count: { select: { items: true } } },
        },
        _count: {
          select: { productionOrders: true, finishedGoods: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(products);
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to fetch products', error: error.message });
  }
};

export const getProductById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        boms: {
          include: {
            items: {
              include: {
                material: true,
              },
            },
          },
        },
        finishedGoods: true,
      },
    });

    if (!product) {
      res.status(404).json({ message: 'Product not found' });
      return;
    }

    res.json(product);
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to fetch product details', error: error.message });
  }
};

export const createProduct = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { modelNumber, productName, wattage, description, status } = req.body;

    if (!modelNumber || !productName || wattage === undefined) {
      res.status(400).json({ message: 'Model number, product name, and wattage are required.' });
      return;
    }

    const existing = await prisma.product.findUnique({
      where: { modelNumber: modelNumber.trim().toUpperCase() },
    });

    if (existing) {
      res.status(400).json({ message: `Product with model ${modelNumber} already exists.` });
      return;
    }

    const product = await prisma.product.create({
      data: {
        modelNumber: modelNumber.trim().toUpperCase(),
        productName: productName.trim(),
        wattage: parseFloat(wattage),
        description: description?.trim() || null,
        status: status || ProductStatus.ACTIVE,
      },
    });

    await logAudit(
      req.user?.id,
      req.user?.name || 'User',
      'PRODUCT_CREATED',
      'Product Master',
      `Created product ${product.modelNumber} (${product.productName})`,
      req.ip
    );

    res.status(201).json(product);
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to create product', error: error.message });
  }
};

export const updateProduct = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { modelNumber, productName, wattage, description, status } = req.body;

    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ message: 'Product not found.' });
      return;
    }

    const updated = await prisma.product.update({
      where: { id },
      data: {
        modelNumber: modelNumber ? modelNumber.trim().toUpperCase() : existing.modelNumber,
        productName: productName ? productName.trim() : existing.productName,
        wattage: wattage !== undefined ? parseFloat(wattage) : existing.wattage,
        description: description !== undefined ? description?.trim() : existing.description,
        status: status || existing.status,
      },
    });

    await logAudit(
      req.user?.id,
      req.user?.name || 'User',
      'PRODUCT_UPDATED',
      'Product Master',
      `Updated product ${updated.modelNumber}`,
      req.ip
    );

    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to update product', error: error.message });
  }
};

export const deleteProduct = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        _count: {
          select: { productionOrders: true, finishedGoods: true },
        },
      },
    });

    if (!product) {
      res.status(404).json({ message: 'Product not found.' });
      return;
    }

    if (product._count.productionOrders > 0 || product._count.finishedGoods > 0) {
      res.status(400).json({
        message: 'Cannot delete product with existing production orders or finished goods inventory.',
      });
      return;
    }

    await prisma.product.delete({ where: { id } });

    await logAudit(
      req.user?.id,
      req.user?.name || 'User',
      'PRODUCT_DELETED',
      'Product Master',
      `Deleted product ${product.modelNumber}`,
      req.ip
    );

    res.json({ message: 'Product deleted successfully.' });
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to delete product', error: error.message });
  }
};
