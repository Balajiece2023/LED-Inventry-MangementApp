import { Router } from 'express';
import { getFinishedGoods, getFinishedGoodsStats } from '../controllers/finishedGoodsController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/', getFinishedGoods);
router.get('/stats', getFinishedGoodsStats);

export default router;
