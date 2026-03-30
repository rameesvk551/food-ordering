import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { validateTenant } from '../middleware/tenantValidation';
import {
  verifyWebhook,
  handleWebhook,
  connectWhatsApp,
  getWhatsAppStatus,
  getEmbeddedConfig,
  completeEmbeddedSignup,
} from '../controllers/whatsapp.controller';
import { handleFlowRequest } from '../controllers/flow.controller';

const router = Router();

// Webhook routes (no auth - called by WhatsApp)
router.get('/webhook', verifyWebhook);
router.post('/webhook', handleWebhook);
router.post('/flow', handleFlowRequest);

// Protected routes
router.post('/connect', authenticate, validateTenant, connectWhatsApp);
router.get('/status', authenticate, validateTenant, getWhatsAppStatus);

// Embedded Signup routes
router.get('/embedded/config', authenticate, validateTenant, getEmbeddedConfig);
router.post('/embedded/complete', authenticate, validateTenant, completeEmbeddedSignup);

export default router;
