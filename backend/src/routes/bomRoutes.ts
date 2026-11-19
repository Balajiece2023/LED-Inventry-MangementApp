import { Router } from 'express';
import { getBOMs, getBOMById, getActiveBOMForProduct, createBOM, updateBOM } from '../controllers/bomController';
import { authenticate, requireRoles } from '../middleware/auth';
import { Role } from '@prisma/client';

const router = Router();

router.use(authenticate);

router.get('/', getBOMs);
router.get('/calculate/:productId', getActiveBOMForProduct);
router.get('/:id', getBOMById);
router.post('/', requireRoles(Role.ADMIN, Role.PRODUCTION_SUPERVISOR), createBOM);
router.put('/:id', requireRoles(Role.ADMIN, Role.PRODUCTION_SUPERVISOR), updateBOM);

export default router;
