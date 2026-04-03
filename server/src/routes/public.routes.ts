import { Router } from 'express';
import {
	getAllRestaurantMenus,
	getStoreBySlug,
	placeWebOrder,
	resolveCustomerSession,
	getCustomerCart,
	upsertCustomerCart,
	getCustomerOrders,
} from '../controllers/public.controller';

const router = Router();

// Public routes - no auth needed (customer-facing)
router.get('/discover/menu-items', getAllRestaurantMenus);
router.get('/:slug', getStoreBySlug);
router.post('/:slug/session', resolveCustomerSession);
router.get('/:slug/cart', getCustomerCart);
router.put('/:slug/cart', upsertCustomerCart);
router.get('/:slug/orders', getCustomerOrders);
router.post('/:slug/order', placeWebOrder);

export default router;
