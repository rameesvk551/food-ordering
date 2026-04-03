import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { validateTenant } from '../middleware/tenantValidation';
import {
  getRestaurantSettings,
  updateRestaurantSettings,
  updateRestaurantImages,
  removeImage,
  getRestaurantCuisines,
  updateBusinessHours,
} from '../controllers/restaurant.controller';

const router = Router();

router.use(authenticate, validateTenant);

router.get('/settings', getRestaurantSettings);
router.put('/settings', updateRestaurantSettings);
router.post('/images', updateRestaurantImages);
router.delete('/images', removeImage);
router.get('/cuisines', getRestaurantCuisines);
router.put('/business-hours', updateBusinessHours);

export default router;
