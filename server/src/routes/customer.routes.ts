import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { validateTenant } from '../middleware/tenantValidation';
import { getCustomers, getCustomer } from '../controllers/customer.controller';

const router = Router();

router.use(authenticate, validateTenant);

router.get('/', getCustomers);
router.get('/:id', getCustomer);

export default router;
