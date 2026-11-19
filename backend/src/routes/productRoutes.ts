import { Router } from 'express';
import { getProducts, getProductById, createProduct, updateProduct, deleteProduct } from '../controllers/productController';
import { authenticate, requireRoles } from '../middleware/auth';
import { Role } from '@prisma/client';

const router = Router();

router.use(authenticate);

router.get('/', getProducts);
router.get('/:id', getProductById);
router.post('/', requireRoles(Role.ADMIN, Role.PRODUCTION_SUPERVISOR), createProduct);
router.put('/:id', requireRoles(Role.ADMIN, Role.PRODUCTION_SUPERVISOR), updateProduct);
router.delete('/:id', requireRoles(Role.ADMIN), deleteProduct);

export default router;
