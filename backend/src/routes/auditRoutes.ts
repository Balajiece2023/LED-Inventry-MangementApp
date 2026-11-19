import { Router } from 'express';
import { getAuditLogs } from '../controllers/auditController';
import { authenticate, requireRoles } from '../middleware/auth';
import { Role } from '@prisma/client';

const router = Router();
router.use(authenticate);

// Audit logs are viewable by Admin (and supervisors)
router.get('/', requireRoles(Role.ADMIN, Role.PRODUCTION_SUPERVISOR), getAuditLogs);

export default router;
