import { Response } from 'express';
import { OrderStatus, AssemblyStage, TransactionType, NotificationType, Role, QCResult } from '@prisma/client';
import prisma from '../prisma';
import { AuthRequest } from '../middleware/auth';
import { logAudit, createNotification } from '../services/auditService';

export const getProductionOrders = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { status, stage, search } = req.query;

    const where: any = {};
    if (status && status !== 'ALL') {
      where.status = status as OrderStatus;
    }
    if (stage && stage !== 'ALL') {
      where.stage = stage as AssemblyStage;
    }
    if (search && typeof search === 'string') {
      where.OR = [
        { orderNumber: { contains: search, mode: 'insensitive' } },
        { product: { modelNumber: { contains: search, mode: 'insensitive' } } },
        { product: { productName: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const orders = await prisma.productionOrder.findMany({
      where,
      include: {
        product: { select: { id: true, modelNumber: true, productName: true, wattage: true } },
        createdBy: { select: { id: true, name: true, role: true } },
        requiredMaterials: {
          include: {
            material: {
              select: {
                id: true,
                materialCode: true,
                materialName: true,
                unit: true,
                currentStock: true,
                reservedStock: true,
              },
            },
          },
        },
        qcReports: {
          select: {
            id: true,
            reportNumber: true,
            batchNumber: true,
            result: true,
            failureReason: true,
            createdAt: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(orders);
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to fetch production orders', error: error.message });
  }
};

export const getProductionOrderById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const order = await prisma.productionOrder.findUnique({
      where: { id },
      include: {
        product: true,
        createdBy: { select: { id: true, name: true, email: true, role: true } },
        requiredMaterials: {
          include: {
            material: true,
          },
        },
        qcReports: {
          include: {
            certificate: true,
          },
        },
      },
    });

    if (!order) {
      res.status(404).json({ message: 'Production order not found' });
      return;
    }

    res.json(order);
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to fetch order details', error: error.message });
  }
};

export const createProductionOrder = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { productId, quantity, productionDate, notes } = req.body;

    const qty = parseInt(quantity);
    if (!productId || isNaN(qty) || qty <= 0) {
      res.status(400).json({ message: 'Product ID and valid positive quantity are required.' });
      return;
    }

    // Verify product exists
    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) {
      res.status(404).json({ message: 'Product not found.' });
      return;
    }

    // Find active BOM for this product
    const bom = await prisma.bOM.findFirst({
      where: { productId, status: 'ACTIVE' },
      include: { items: { include: { material: true } } },
      orderBy: { version: 'desc' },
    });

    if (!bom || bom.items.length === 0) {
      res.status(400).json({
        message: `No active Bill of Materials (BOM) found for product ${product.modelNumber}. Please define a BOM first.`,
      });
      return;
    }

    // Generate Order Number
    const count = await prisma.productionOrder.count();
    const orderNumber = `PO-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

    // Prepare required materials from BOM
    const requiredMaterialsData = bom.items.map((item) => ({
      materialId: item.materialId,
      requiredQuantity: item.quantityRequired * qty,
      reservedQuantity: 0,
      issuedQuantity: 0,
    }));

    const order = await prisma.productionOrder.create({
      data: {
        orderNumber,
        productId,
        quantity: qty,
        productionDate: productionDate ? new Date(productionDate) : new Date(),
        status: OrderStatus.DRAFT,
        stage: AssemblyStage.MATERIAL_ISSUED,
        stageNotes: notes?.trim() || 'Order created in DRAFT status.',
        createdById: req.user?.id,
        requiredMaterials: {
          create: requiredMaterialsData,
        },
      },
      include: {
        product: true,
        requiredMaterials: { include: { material: true } },
      },
    });

    await logAudit(
      req.user?.id,
      req.user?.name || 'Supervisor',
      'PRODUCTION_ORDER_CREATED',
      'Production',
      `Created order ${order.orderNumber} for ${qty}x ${product.modelNumber}`,
      req.ip
    );

    res.status(201).json(order);
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to create production order', error: error.message });
  }
};

/**
 * MATERIAL RESERVATION LOGIC:
 * When Production Order is Locked:
 * Move stock from Available to Reserved stock.
 * Create inventory transaction logs for every movement.
 */
export const lockProductionOrder = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const order = await prisma.productionOrder.findUnique({
      where: { id },
      include: {
        product: true,
        requiredMaterials: { include: { material: true } },
      },
    });

    if (!order) {
      res.status(404).json({ message: 'Order not found' });
      return;
    }

    if (order.status !== OrderStatus.DRAFT) {
      res.status(400).json({ message: `Cannot lock order with status ${order.status}. Only DRAFT orders can be locked.` });
      return;
    }

    // Check material availability before locking
    const shortages: any[] = [];
    for (const item of order.requiredMaterials) {
      const available = item.material.currentStock - item.material.reservedStock;
      if (available < item.requiredQuantity) {
        shortages.push({
          materialCode: item.material.materialCode,
          materialName: item.material.materialName,
          required: item.requiredQuantity,
          available,
          shortage: item.requiredQuantity - available,
        });
      }
    }

    if (shortages.length > 0) {
      // Create shortage notification
      await createNotification(
        'Material Shortage Detected',
        `Cannot lock order ${order.orderNumber}: ${shortages.map((s) => `${s.materialCode} short by ${s.shortage}`).join(', ')}`,
        NotificationType.MATERIAL_SHORTAGE,
        Role.STORE_KEEPER,
        '/materials'
      );

      res.status(400).json({
        message: 'Material shortage detected. Cannot reserve materials.',
        shortages,
      });
      return;
    }

    // Execute atomic reservation
    await prisma.$transaction(async (tx) => {
      for (const item of order.requiredMaterials) {
        // Increase reserved stock in material
        const updatedMat = await tx.material.update({
          where: { id: item.materialId },
          data: {
            reservedStock: { increment: item.requiredQuantity },
          },
        });

        // Update reservedQuantity on ProductionOrderMaterial
        await tx.productionOrderMaterial.update({
          where: { id: item.id },
          data: {
            reservedQuantity: item.requiredQuantity,
          },
        });

        // Create transaction log
        await tx.inventoryTransaction.create({
          data: {
            materialId: item.materialId,
            transactionType: TransactionType.RESERVED,
            quantity: item.requiredQuantity,
            previousStock: item.material.currentStock,
            newStock: item.material.currentStock, // Physical stock unchanged, reserved increased
            referenceType: 'PRODUCTION_ORDER',
            referenceId: order.orderNumber,
            notes: `Reserved ${item.requiredQuantity} ${item.material.unit} for locked order ${order.orderNumber}`,
            createdById: req.user?.id,
          },
        });
      }

      // Update order status to LOCKED
      await tx.productionOrder.update({
        where: { id },
        data: {
          status: OrderStatus.LOCKED,
          stageNotes: 'Order locked. Raw materials successfully reserved in store inventory.',
        },
      });
    });

    await logAudit(
      req.user?.id,
      req.user?.name || 'Supervisor',
      'PRODUCTION_ORDER_LOCKED',
      'Production',
      `Locked order ${order.orderNumber} and reserved materials in inventory.`,
      req.ip
    );

    res.json({ message: `Order ${order.orderNumber} locked and materials reserved successfully.` });
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to lock order', error: error.message });
  }
};

/**
 * Release reserved stock if order is cancelled
 */
export const cancelProductionOrder = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const order = await prisma.productionOrder.findUnique({
      where: { id },
      include: {
        requiredMaterials: { include: { material: true } },
      },
    });

    if (!order) {
      res.status(404).json({ message: 'Order not found' });
      return;
    }

    if (order.status === OrderStatus.COMPLETED || order.status === OrderStatus.CANCELLED) {
      res.status(400).json({ message: `Order is already ${order.status}.` });
      return;
    }

    // Execute atomic release
    await prisma.$transaction(async (tx) => {
      // If materials were reserved, release them back to available stock
      for (const item of order.requiredMaterials) {
        if (item.reservedQuantity > 0) {
          await tx.material.update({
            where: { id: item.materialId },
            data: {
              reservedStock: { decrement: item.reservedQuantity },
            },
          });

          await tx.productionOrderMaterial.update({
            where: { id: item.id },
            data: { reservedQuantity: 0 },
          });

          // Create UNRESERVED transaction
          await tx.inventoryTransaction.create({
            data: {
              materialId: item.materialId,
              transactionType: TransactionType.UNRESERVED,
              quantity: item.reservedQuantity,
              previousStock: item.material.currentStock,
              newStock: item.material.currentStock,
              referenceType: 'PRODUCTION_ORDER_CANCELLED',
              referenceId: order.orderNumber,
              notes: `Released reserved stock (${item.reservedQuantity} ${item.material.unit}) due to order cancellation`,
              createdById: req.user?.id,
            },
          });
        }
      }

      await tx.productionOrder.update({
        where: { id },
        data: {
          status: OrderStatus.CANCELLED,
          stageNotes: 'Production order cancelled. All reserved inventory released.',
        },
      });
    });

    await logAudit(
      req.user?.id,
      req.user?.name || 'Supervisor',
      'PRODUCTION_ORDER_CANCELLED',
      'Production',
      `Cancelled order ${order.orderNumber} and restored reserved inventory.`,
      req.ip
    );

    res.json({ message: `Order ${order.orderNumber} cancelled. Materials released to available stock.` });
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to cancel order', error: error.message });
  }
};

/**
 * ASSEMBLY TRACKING:
 * Update stage:
 * MATERIAL_ISSUED -> ASSEMBLY_STARTED -> ASSEMBLY_COMPLETED -> TESTING -> PACKING -> FINISHED
 */
export const updateAssemblyStage = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { stage, notes } = req.body;

    if (!stage || !Object.values(AssemblyStage).includes(stage)) {
      res.status(400).json({ message: 'Valid assembly stage is required.' });
      return;
    }

    const order = await prisma.productionOrder.findUnique({
      where: { id },
      include: {
        product: true,
        requiredMaterials: { include: { material: true } },
      },
    });

    if (!order) {
      res.status(404).json({ message: 'Order not found' });
      return;
    }

    if (order.status === OrderStatus.CANCELLED) {
      res.status(400).json({ message: 'Cannot update stage on cancelled order.' });
      return;
    }

    const newStage = stage as AssemblyStage;

    await prisma.$transaction(async (tx) => {
      let newOrderStatus = order.status;

      // When moving to ASSEMBLY_STARTED, transition order to IN_PROGRESS and consume/issue reserved materials
      if (newStage === AssemblyStage.ASSEMBLY_STARTED && order.status === OrderStatus.LOCKED) {
        newOrderStatus = OrderStatus.IN_PROGRESS;

        for (const item of order.requiredMaterials) {
          const qtyToIssue = item.reservedQuantity > 0 ? item.reservedQuantity : item.requiredQuantity;

          // Deduct from currentStock and reservedStock
          const prev = item.material.currentStock;
          const next = Math.max(0, prev - qtyToIssue);

          await tx.material.update({
            where: { id: item.materialId },
            data: {
              currentStock: next,
              reservedStock: { decrement: item.reservedQuantity },
            },
          });

          await tx.productionOrderMaterial.update({
            where: { id: item.id },
            data: {
              reservedQuantity: 0,
              issuedQuantity: qtyToIssue,
            },
          });

          await tx.inventoryTransaction.create({
            data: {
              materialId: item.materialId,
              transactionType: TransactionType.CONSUMED,
              quantity: qtyToIssue,
              previousStock: prev,
              newStock: next,
              referenceType: 'ASSEMBLY_LINE_ISSUE',
              referenceId: order.orderNumber,
              notes: `Consumed for assembly of ${order.quantity} units of ${order.product.modelNumber}`,
              createdById: req.user?.id,
            },
          });
        }
      }

      // If stage reached FINISHED, mark order as COMPLETED
      if (newStage === AssemblyStage.FINISHED) {
        newOrderStatus = OrderStatus.COMPLETED;
      }

      await tx.productionOrder.update({
        where: { id },
        data: {
          stage: newStage,
          status: newOrderStatus,
          stageNotes: notes?.trim() || `Advanced to stage: ${newStage}`,
        },
      });
    });

    await logAudit(
      req.user?.id,
      req.user?.name || 'Supervisor',
      'ASSEMBLY_STAGE_UPDATED',
      'Assembly Tracking',
      `Order ${order.orderNumber} advanced to ${newStage}`,
      req.ip
    );

    res.json({ message: `Order ${order.orderNumber} updated to ${newStage}.` });
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to update assembly stage', error: error.message });
  }
};
