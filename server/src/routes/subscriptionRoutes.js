import { Router } from 'express';
import {
  cancelSubscription,
  createSubscription,
  deleteSubscription,
  deleteUsageLog,
  getSubscription,
  getUsageHistory,
  listSubscriptions,
  logUsage,
  resetUsage,
  setUsage,
  updateSubscription,
} from '../controllers/subscriptionController.js';
import { getDashboardStats } from '../controllers/statsController.js';
import {
  cancelSubscriptionRules,
  createSubscriptionRules,
  idParamRules,
  logIdParamRules,
  updateSubscriptionRules,
  usageIncrementRules,
  usageSetRules,
  validate,
} from '../middleware/validate.js';

const router = Router();

// /stats must be declared before /:id so it is not parsed as an id.
router.get('/stats', getDashboardStats);

router
  .route('/')
  .get(listSubscriptions)
  .post(createSubscriptionRules, validate, createSubscription);

router
  .route('/:id')
  .get(idParamRules, validate, getSubscription)
  .put(updateSubscriptionRules, validate, updateSubscription)
  .delete(idParamRules, validate, deleteSubscription);

router.post('/:id/cancel', cancelSubscriptionRules, validate, cancelSubscription);

// Usage aggregate routes
router.post('/:id/usage', usageIncrementRules, validate, logUsage);
router.put('/:id/usage', usageSetRules, validate, setUsage);
router.delete('/:id/usage', idParamRules, validate, resetUsage);

// Usage history routes
router.get('/:id/usage/history', idParamRules, validate, getUsageHistory);
router.delete('/:id/usage/:logId', logIdParamRules, validate, deleteUsageLog);

export default router;
