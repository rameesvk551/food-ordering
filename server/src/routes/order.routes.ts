import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { validateTenant } from '../middleware/tenantValidation';
import { getOrders, getOrder, updateOrderStatus } from '../controllers/order.controller';

const router = Router();

router.use(authenticate, validateTenant);

router.get('/', getOrders);
router.get('/:id', getOrder);
router.patch('/:id/status', updateOrderStatus);

export default router;
