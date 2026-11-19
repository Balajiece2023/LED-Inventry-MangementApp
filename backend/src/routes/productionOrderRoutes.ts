import { Router } from 'express';
import {
  getProductionOrders,
  getProductionOrderById,
  createProductionOrder,
  lockProductionOrder,
  cancelProductionOrder,
  updateAssemblyStage,
} from '../controllers/productionOrderController';
import { authenticate, requireRoles } from '../middleware/auth';
import { Role } from '@prisma/client';

const router = Router();

router.use(authenticate);

router.get('/', getProductionOrders);
router.get('/:id', getProductionOrderById);
router.post('/', requireRoles(Role.ADMIN, Role.PRODUCTION_SUPERVISOR), createProductionOrder);
router.post('/:id/lock', requireRoles(Role.ADMIN, Role.PRODUCTION_SUPERVISOR), lockProductionOrder);
router.post('/:id/cancel', requireRoles(Role.ADMIN, Role.PRODUCTION_SUPERVISOR), cancelProductionOrder);
router.put('/:id/stage', requireRoles(Role.ADMIN, Role.PRODUCTION_SUPERVISOR), updateAssemblyStage);

export default router;
