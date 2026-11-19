import { Router } from 'express';
import { getDispatchOrders, createDispatchOrder, completeDispatch } from '../controllers/dispatchController';
import { authenticate, requireRoles } from '../middleware/auth';
import { Role } from '@prisma/client';

const router = Router();

router.use(authenticate);

router.get('/', getDispatchOrders);
router.post('/', requireRoles(Role.ADMIN, Role.DISPATCH_TEAM), createDispatchOrder);
router.post('/:id/complete', requireRoles(Role.ADMIN, Role.DISPATCH_TEAM), completeDispatch);

export default router;
