import { Router } from 'express';
import { login, getMe, getAllUsers, createUser } from '../controllers/authController';
import { authenticate, requireRoles } from '../middleware/auth';
import { Role } from '@prisma/client';

const router = Router();

router.post('/login', login);
router.get('/me', authenticate, getMe);
router.get('/users', authenticate, requireRoles(Role.ADMIN), getAllUsers);
router.post('/users', authenticate, requireRoles(Role.ADMIN), createUser);

export default router;
