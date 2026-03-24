import { Router } from 'express';
import { getStoreBySlug, placeWebOrder } from '../controllers/public.controller';

const router = Router();

// Public routes - no auth needed (customer-facing)
router.get('/:slug', getStoreBySlug);
router.post('/:slug/order', placeWebOrder);

export default router;
