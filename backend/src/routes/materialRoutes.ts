import { Router } from 'express';
import {
  getMaterials,
  getMaterialById,
  createMaterial,
  updateMaterial,
  addStock,
  adjustStock,
  getTransactions,
} from '../controllers/materialController';
import { authenticate, requireRoles } from '../middleware/auth';
import { Role } from '@prisma/client';

const router = Router();

router.use(authenticate);

router.get('/', getMaterials);
router.get('/transactions', getTransactions);
router.get('/:id', getMaterialById);
router.post('/', requireRoles(Role.ADMIN, Role.STORE_KEEPER), createMaterial);
router.put('/:id', requireRoles(Role.ADMIN, Role.STORE_KEEPER), updateMaterial);
router.post('/:id/add-stock', requireRoles(Role.ADMIN, Role.STORE_KEEPER), addStock);
router.post('/:id/adjust-stock', requireRoles(Role.ADMIN, Role.STORE_KEEPER), adjustStock);

export default router;
