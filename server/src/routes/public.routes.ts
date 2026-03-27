import { Router } from 'express';
import { getAllRestaurantMenus, getStoreBySlug, placeWebOrder } from '../controllers/public.controller';

const router = Router();

// Public routes - no auth needed (customer-facing)
router.get('/discover/menu-items', getAllRestaurantMenus);
router.get('/:slug', getStoreBySlug);
router.post('/:slug/order', placeWebOrder);

export default router;
