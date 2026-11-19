import { Router } from 'express';
import { getQCReports, getQCReportById, createQCReport, getCertificates } from '../controllers/qcController';
import { authenticate, requireRoles } from '../middleware/auth';
import { Role } from '@prisma/client';

const router = Router();

router.use(authenticate);

router.get('/reports', getQCReports);
router.get('/reports/:id', getQCReportById);
router.post('/reports', requireRoles(Role.ADMIN, Role.QC_ENGINEER), createQCReport);
router.get('/certificates', getCertificates);

export default router;
