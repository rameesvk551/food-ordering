import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { validateTenant } from '../middleware/tenantValidation';
import {
  getMenu,
  updateMenu,
  addCategory,
  addMenuItem,
  updateMenuItem,
  deleteMenuItem,
  deleteCategory,
} from '../controllers/menu.controller';

const router = Router();

router.use(authenticate, validateTenant);

router.get('/', getMenu);
router.put('/', updateMenu);
router.post('/categories', addCategory);
router.delete('/categories/:categoryId', deleteCategory);
router.post('/categories/:categoryId/items', addMenuItem);
router.put('/categories/:categoryId/items/:itemId', updateMenuItem);
router.delete('/categories/:categoryId/items/:itemId', deleteMenuItem);

export default router;
