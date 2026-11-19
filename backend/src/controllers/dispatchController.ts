import { Response } from 'express';
import { DispatchStatus, NotificationType, Role } from '@prisma/client';
import prisma from '../prisma';
import { AuthRequest } from '../middleware/auth';
import { logAudit, createNotification } from '../services/auditService';

export const getDispatchOrders = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { status, search } = req.query;

    const where: any = {};
    if (status && status !== 'ALL') {
      where.status = status as DispatchStatus;
    }
    if (search && typeof search === 'string') {
      where.OR = [
        { dispatchOrderNumber: { contains: search, mode: 'insensitive' } },
        { customerName: { contains: search, mode: 'insensitive' } },
        { invoiceNumber: { contains: search, mode: 'insensitive' } },
        { product: { modelNumber: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const orders = await prisma.dispatchOrder.findMany({
      where,
      include: {
        product: true,
        createdBy: { select: { id: true, name: true, role: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(orders);
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to fetch dispatch orders', error: error.message });
  }
};

export const createDispatchOrder = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { customerName, invoiceNumber, productId, quantity, dispatchDate } = req.body;

    const qty = parseInt(quantity);
    if (!customerName || !invoiceNumber || !productId || isNaN(qty) || qty <= 0) {
      res.status(400).json({ message: 'Customer name, invoice number, product, and valid quantity are required.' });
      return;
    }

    // Check unique invoice
    const existingInv = await prisma.dispatchOrder.findUnique({
      where: { invoiceNumber: invoiceNumber.trim().toUpperCase() },
    });

    if (existingInv) {
      res.status(400).json({ message: `Invoice number ${invoiceNumber} already exists.` });
      return;
    }

    // Check finished goods availability
    const fgItems = await prisma.finishedGoods.findMany({
      where: { productId, qcStatus: 'PASS' },
    });

    const totalAvailable = fgItems.reduce((sum, item) => sum + (item.quantity - item.reservedQuantity), 0);

    if (totalAvailable < qty) {
      res.status(400).json({
        message: `Insufficient finished goods stock. Requested: ${qty}, Available: ${totalAvailable}.`,
        requested: qty,
        available: totalAvailable,
      });
      return;
    }

    // Generate dispatch order number
    const count = await prisma.dispatchOrder.count();
    const dispatchOrderNumber = `DSP-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

    // Create dispatch order in PENDING status & reserve the finished goods
    const order = await prisma.$transaction(async (tx) => {
      // Allocate reservation across FG batches
      let remainingToReserve = qty;
      for (const fg of fgItems) {
        if (remainingToReserve <= 0) break;
        const availableInBatch = fg.quantity - fg.reservedQuantity;
        if (availableInBatch > 0) {
          const allocate = Math.min(availableInBatch, remainingToReserve);
          await tx.finishedGoods.update({
            where: { id: fg.id },
            data: { reservedQuantity: { increment: allocate } },
          });
          remainingToReserve -= allocate;
        }
      }

      return tx.dispatchOrder.create({
        data: {
          dispatchOrderNumber,
          customerName: customerName.trim(),
          invoiceNumber: invoiceNumber.trim().toUpperCase(),
          productId,
          quantity: qty,
          dispatchDate: dispatchDate ? new Date(dispatchDate) : new Date(),
          status: DispatchStatus.PENDING,
          createdById: req.user?.id,
        },
        include: { product: true },
      });
    });

    await logAudit(
      req.user?.id,
      req.user?.name || 'Dispatch Officer',
      'CUSTOMER_ORDER_CREATED',
      'Dispatch Management',
      `Created customer order ${order.dispatchOrderNumber} for ${customerName} (Invoice: ${invoiceNumber}, Qty: ${qty})`,
      req.ip
    );

    res.status(201).json(order);
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to create customer order', error: error.message });
  }
};

/**
 * Dispatch Products:
 * Verify availability, reduce Finished Goods inventory, update status to DISPATCHED.
 */
export const completeDispatch = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const order = await prisma.dispatchOrder.findUnique({
      where: { id },
      include: { product: true },
    });

    if (!order) {
      res.status(404).json({ message: 'Dispatch order not found.' });
      return;
    }

    if (order.status === DispatchStatus.DISPATCHED) {
      res.status(400).json({ message: 'Order is already dispatched.' });
      return;
    }

    // Atomic dispatch execution: deduct from Finished Goods batches
    await prisma.$transaction(async (tx) => {
      let remainingToDeduct = order.quantity;

      const fgBatches = await tx.finishedGoods.findMany({
        where: { productId: order.productId, qcStatus: 'PASS' },
        orderBy: { manufacturingDate: 'asc' }, // FIFO
      });

      for (const batch of fgBatches) {
        if (remainingToDeduct <= 0) break;
        const deduct = Math.min(batch.quantity, remainingToDeduct);

        // Deduct from batch quantity and batch reservedQuantity
        const newReserved = Math.max(0, batch.reservedQuantity - deduct);
        const newQty = Math.max(0, batch.quantity - deduct);

        await tx.finishedGoods.update({
          where: { id: batch.id },
          data: {
            quantity: newQty,
            reservedQuantity: newReserved,
          },
        });

        remainingToDeduct -= deduct;
      }

      await tx.dispatchOrder.update({
        where: { id },
        data: {
          status: DispatchStatus.DISPATCHED,
          dispatchDate: new Date(),
        },
      });
    });

    await logAudit(
      req.user?.id,
      req.user?.name || 'Dispatch Team',
      'DISPATCH_COMPLETED',
      'Dispatch Management',
      `Dispatched ${order.quantity} units of ${order.product.modelNumber} for invoice ${order.invoiceNumber}`,
      req.ip
    );

    res.json({ message: `Order ${order.dispatchOrderNumber} dispatched successfully. Finished goods deducted.` });
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to complete dispatch', error: error.message });
  }
};
