import { Response } from 'express';
import { QCResult, FailureReason, NotificationType, Role } from '@prisma/client';
import prisma from '../prisma';
import { AuthRequest } from '../middleware/auth';
import { logAudit, createNotification } from '../services/auditService';

export const getQCReports = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { result, search } = req.query;

    const where: any = {};
    if (result && result !== 'ALL') {
      where.result = result as QCResult;
    }
    if (search && typeof search === 'string') {
      where.OR = [
        { reportNumber: { contains: search, mode: 'insensitive' } },
        { batchNumber: { contains: search, mode: 'insensitive' } },
        { inspectorName: { contains: search, mode: 'insensitive' } },
        { productionOrder: { orderNumber: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const reports = await prisma.qCReport.findMany({
      where,
      include: {
        productionOrder: {
          include: { product: true },
        },
        certificate: true,
        inspectedBy: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(reports);
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to fetch QC reports', error: error.message });
  }
};

export const getQCReportById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const report = await prisma.qCReport.findUnique({
      where: { id },
      include: {
        productionOrder: {
          include: {
            product: true,
          },
        },
        certificate: {
          include: { product: true },
        },
        inspectedBy: true,
      },
    });

    if (!report) {
      res.status(404).json({ message: 'QC report not found' });
      return;
    }

    res.json(report);
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to fetch QC report', error: error.message });
  }
};

export const createQCReport = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const {
      productionOrderId,
      batchNumber,
      voltage,
      current,
      power,
      temperature,
      burnInTestDuration,
      remarks,
      result,
      failureReason,
      images,
      pdfReportUrl,
    } = req.body;

    if (!productionOrderId || !batchNumber || voltage === undefined || current === undefined || power === undefined || temperature === undefined) {
      res.status(400).json({ message: 'Production order ID, batch number, voltage, current, power, and temperature are required.' });
      return;
    }

    const order = await prisma.productionOrder.findUnique({
      where: { id: productionOrderId },
      include: { product: true },
    });

    if (!order) {
      res.status(404).json({ message: 'Production order not found.' });
      return;
    }

    const count = await prisma.qCReport.count();
    const reportNumber = `QCR-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;
    const inspectorName = req.user?.name || 'QC Inspector';
    const isPass = result === QCResult.PASS;

    const resultEnum = isPass ? QCResult.PASS : QCResult.FAIL;
    const failureReasonEnum = isPass ? FailureReason.NONE : (failureReason as FailureReason) || FailureReason.OTHER;

    // Transaction to create report, auto-create certificate if PASS, and move to finished goods
    const finalResult = await prisma.$transaction(async (tx) => {
      // 1. Create QC Report
      const qcReport = await tx.qCReport.create({
        data: {
          reportNumber,
          productionOrderId,
          batchNumber: batchNumber.trim().toUpperCase(),
          voltage: parseFloat(voltage),
          current: parseFloat(current),
          power: parseFloat(power),
          temperature: parseFloat(temperature),
          burnInTestDuration: burnInTestDuration?.trim() || '4 Hours continuous aging test',
          remarks: remarks?.trim() || (isPass ? 'All parameters within standard tolerance.' : 'Failed quality criteria.'),
          result: resultEnum,
          failureReason: failureReasonEnum,
          inspectedById: req.user?.id,
          inspectorName,
          images: images ? (typeof images === 'string' ? images : JSON.stringify(images)) : null,
          pdfReportUrl: pdfReportUrl || null,
        },
      });

      let cert = null;
      // 2. If PASS: Auto-generate QC Certificate & move to Finished Goods!
      if (isPass) {
        const certCount = await tx.qCCertificate.count();
        const certificateNumber = `QCC-${new Date().getFullYear()}-${String(certCount + 1).padStart(3, '0')}`;

        cert = await tx.qCCertificate.create({
          data: {
            certificateNumber,
            qcReportId: qcReport.id,
            batchNumber: batchNumber.trim().toUpperCase(),
            productId: order.productId,
            inspectionDate: new Date(),
            inspectorName,
            result: QCResult.PASS,
          },
        });

        // 3. Move PASS products to Finished Goods Inventory
        const existingFG = await tx.finishedGoods.findUnique({
          where: { batchNumber: batchNumber.trim().toUpperCase() },
        });

        if (existingFG) {
          await tx.finishedGoods.update({
            where: { id: existingFG.id },
            data: {
              quantity: existingFG.quantity + order.quantity,
              qcStatus: QCResult.PASS,
            },
          });
        } else {
          await tx.finishedGoods.create({
            data: {
              batchNumber: batchNumber.trim().toUpperCase(),
              productId: order.productId,
              quantity: order.quantity,
              reservedQuantity: 0,
              manufacturingDate: new Date(),
              qcStatus: QCResult.PASS,
              notes: `Moved from completed batch ${batchNumber}. Passed QC testing.`,
            },
          });
        }
      } else {
        // If FAIL, trigger QC Failure Alert
        await createNotification(
          'QC Inspection Failure',
          `Batch ${batchNumber} (${order.product.modelNumber}) failed inspection. Reason: ${failureReasonEnum}`,
          NotificationType.QC_FAILURE,
          Role.QC_ENGINEER,
          '/qc-testing'
        );
      }

      return { qcReport, cert };
    });

    await logAudit(
      req.user?.id,
      inspectorName,
      isPass ? 'QC_APPROVED' : 'QC_REJECTED',
      'Quality Control',
      `QC Inspection for Batch ${batchNumber} (${order.product.modelNumber}): ${resultEnum}. Failure reason: ${failureReasonEnum}`,
      req.ip
    );

    res.status(201).json(finalResult);
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to record QC report', error: error.message });
  }
};

export const getCertificates = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const certificates = await prisma.qCCertificate.findMany({
      include: {
        product: true,
        qcReport: {
          include: {
            productionOrder: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(certificates);
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to fetch QC certificates', error: error.message });
  }
};
