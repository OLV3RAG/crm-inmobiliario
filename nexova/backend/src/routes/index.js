import { Router } from 'express';
import { authenticate } from '../middlewares/auth.js';
import { roleGuard, ownerOnly, adminOrOwner } from '../middlewares/roleGuard.js';
import { scopeMiddleware } from '../middlewares/scopeFilter.js';
import { loginLimiter } from '../middlewares/rateLimiter.js';
import * as auth from '../controllers/auth.controller.js';
import * as leads from '../controllers/leads.controller.js';
import * as conversations from '../controllers/conversations.controller.js';
import * as webhooks from '../controllers/webhooks.controller.js';
import * as metaWebhooks from '../controllers/metaWebhook.controller.js';
import * as dashboard from '../controllers/dashboard.controller.js';
import * as asesores from '../controllers/asesores.controller.js';
import * as gerentes from '../controllers/gerentes.controller.js';
import * as finances from '../controllers/finances.controller.js';
import * as marketing from '../controllers/marketing.controller.js';
import * as coaching from '../controllers/coaching.controller.js';
import * as properties from '../controllers/properties.controller.js';
import * as catalog from '../controllers/catalog.controller.js';
import { propertyPhotosUpload, chatAttachmentUpload } from '../middlewares/upload.js';

const router = Router();

router.post('/auth/login', loginLimiter, auth.login);
router.post('/auth/refresh', auth.refresh);
router.post('/auth/logout', auth.logout);
router.post('/auth/forgot-password', auth.forgotPassword);
router.post('/auth/reset-password', auth.resetPassword);
router.get('/webhooks/twilio/ping', webhooks.twilioPing);
router.post('/webhooks/twilio', webhooks.twilioWebhook);
router.get('/webhooks/meta/ping', metaWebhooks.metaPing);
router.get('/webhooks/meta', metaWebhooks.metaWebhookVerify);
router.post('/webhooks/meta', metaWebhooks.metaWebhook);
router.get('/public/properties', properties.listPublicCatalog);
router.get('/public/catalog/mexico', catalog.listMexicoLocations);
router.get('/public/chat-files/:conversationId/:filename', conversations.getPublicChatFile);
router.get('/public/property-photos/:propertyId/:filename', properties.getPublicPropertyPhoto);

router.use(authenticate);

router.get('/auth/me', auth.me);
router.post('/auth/change-password', auth.changePassword);
router.post('/auth/mfa/setup', auth.setupMfa);
router.post('/auth/mfa/enable', auth.enableMfa);

router.get('/dashboard/admin', adminOrOwner, scopeMiddleware('dashboard'), dashboard.adminDashboard);
router.get('/dashboard/owner', ownerOnly, dashboard.ownerDashboard);
router.get('/dashboard/asesor', roleGuard('asesor'), dashboard.asesorDashboard);

router.get('/leads', scopeMiddleware('leads'), leads.listLeads);
router.get('/leads/:id', scopeMiddleware('leads'), leads.getLead);
router.post('/leads', adminOrOwner, scopeMiddleware('leads'), leads.createLead);
router.post('/leads/purge-whatsapp', adminOrOwner, leads.purgeWhatsAppLeadsEndpoint);
router.patch('/leads/:id', scopeMiddleware('leads'), leads.updateLead);
router.delete('/leads/:id', adminOrOwner, scopeMiddleware('leads'), leads.deleteLead);
router.post('/leads/:id/pause-bot', scopeMiddleware('leads'), leads.pauseBot);
router.post('/leads/:id/resume-bot', scopeMiddleware('leads'), leads.resumeBot);
router.post('/leads/:id/assign', adminOrOwner, scopeMiddleware('leads'), leads.assignLead);

router.get('/conversations', scopeMiddleware('conversations'), conversations.listConversations);
router.get('/conversations/messaging/status', conversations.getMessagingStatus);
router.get('/conversations/messages/:messageId/media', scopeMiddleware('conversations'), conversations.getMessageMedia);
router.get('/conversations/:id/messages', scopeMiddleware('conversations'), conversations.getMessages);
router.post('/conversations/:id/read', scopeMiddleware('conversations'), conversations.markConversationRead);
router.post(
  '/conversations/:id/messages',
  scopeMiddleware('conversations'),
  chatAttachmentUpload.array('files', 5),
  conversations.sendMessage,
);
router.post('/conversations/:id/take', scopeMiddleware('conversations'), conversations.takeConversation);

router.get('/gerentes', ownerOnly, gerentes.listGerentes);
router.post('/gerentes', ownerOnly, gerentes.createGerente);
router.patch('/gerentes/:id', ownerOnly, gerentes.updateGerente);

router.get('/asesores/business-options', adminOrOwner, asesores.listBusinessOptions);
router.get('/asesores', adminOrOwner, scopeMiddleware('asesores'), asesores.listAsesores);
router.post('/asesores', adminOrOwner, asesores.createAsesor);
router.patch('/asesores/:id', adminOrOwner, asesores.updateAsesor);

router.get('/finances', ownerOnly, finances.getFinances);
router.get('/finances/revenue', ownerOnly, finances.listRevenue);
router.get('/finances/expenses', ownerOnly, finances.listExpenses);
router.post('/finances/expenses', ownerOnly, finances.createExpense);

router.get('/marketing', ownerOnly, marketing.getMarketing);
router.get('/marketing/campaigns', ownerOnly, marketing.listCampaigns);
router.patch('/marketing/campaigns/:id', ownerOnly, marketing.updateCampaignStatus);
router.get('/marketing/utms', ownerOnly, marketing.listUtmLeads);

router.get('/coaching', coaching.listCoaching);
router.patch('/coaching/:id/reviewed', coaching.markReviewed);

router.get('/catalog/mexico', catalog.listMexicoLocations);

router.get('/properties', scopeMiddleware('properties'), properties.listProperties);
router.get('/properties/facebook/status', adminOrOwner, properties.getFacebookStatus);
router.get('/properties/:id', scopeMiddleware('properties'), properties.getProperty);
router.post('/properties', properties.createProperty);
router.patch('/properties/:id', properties.updateProperty);
router.post('/properties/:id/publish-facebook', adminOrOwner, scopeMiddleware('properties'), properties.publishPropertyFacebook);
router.post('/properties/:id/publish-instagram', adminOrOwner, scopeMiddleware('properties'), properties.publishPropertyInstagram);
router.post('/properties/:id/flyer', adminOrOwner, scopeMiddleware('properties'), properties.generatePropertyFlyerEndpoint);
router.get('/properties/:id/flyer', adminOrOwner, scopeMiddleware('properties'), properties.getPropertyFlyer);
router.post('/properties/:id/publish-flyer', adminOrOwner, scopeMiddleware('properties'), properties.publishPropertyFlyerEndpoint);
router.post('/properties/:id/photos', scopeMiddleware('properties'), properties.requirePropertyEditor, propertyPhotosUpload.array('photos', 12), properties.uploadPropertyPhotos);
router.delete('/properties/:id/photos', scopeMiddleware('properties'), properties.requirePropertyEditor, properties.deletePropertyPhoto);
router.delete('/properties/:id', adminOrOwner, properties.deleteProperty);

export default router;
