import { body, param, validationResult } from 'express-validator';
import { BILLING_CYCLES, CATEGORIES } from '../utils/constants.js';

export function validate(req, res, next) {
  const result = validationResult(req);
  if (result.isEmpty()) return next();

  const errors = result.array().map((error) => ({
    field: error.path,
    message: error.msg,
  }));

  return res.status(422).json({
    message: errors[0]?.message || 'Validation failed',
    errors,
  });
}

const nameRules = [
  body('name')
    .exists({ values: 'falsy' })
    .withMessage('Name is required')
    .bail()
    .isString()
    .withMessage('Name must be text')
    .trim()
    .isLength({ min: 1, max: 80 })
    .withMessage('Name must be between 1 and 80 characters'),
  body('service')
    .exists({ values: 'falsy' })
    .withMessage('Service is required')
    .bail()
    .isString()
    .withMessage('Service must be text')
    .trim()
    .isLength({ min: 1, max: 80 })
    .withMessage('Service must be between 1 and 80 characters'),
];

const detailRules = [
  body('cost')
    .exists({ values: 'null' })
    .withMessage('Cost is required')
    .bail()
    .isFloat({ gt: 0, lt: 10000001 })
    .withMessage('Cost must be a number greater than 0'),
  body('category')
    .optional()
    .isIn(CATEGORIES)
    .withMessage(`Category must be one of: ${CATEGORIES.join(', ')}`),
  body('billingCycle')
    .optional()
    .isIn(BILLING_CYCLES)
    .withMessage('Billing cycle must be monthly, quarterly or yearly'),
  body('billingDate')
    .exists({ values: 'falsy' })
    .withMessage('Billing date is required')
    .bail()
    .isISO8601({ strict: true })
    .withMessage('Billing date must be a valid date (YYYY-MM-DD)')
    .toDate(),
  body('endDate')
    .optional({ values: 'falsy' })
    .isISO8601({ strict: true })
    .withMessage('End date must be a valid date (YYYY-MM-DD)')
    .bail()
    .custom((value, { req }) => {
      if (req.body.billingDate && new Date(value) < new Date(req.body.billingDate)) {
        throw new Error('End date cannot be earlier than the billing date');
      }
      return true;
    })
    .toDate(),
  body('usageCount')
    .optional({ values: 'null' })
    .isInt({ min: 0, max: 100000 })
    .withMessage('Usage count must be a whole number of 0 or more')
    .toInt(),
];

export const createSubscriptionRules = [...nameRules, ...detailRules];

export const updateSubscriptionRules = [...nameRules, ...detailRules];

export const usageIncrementRules = [
  param('id').isMongoId().withMessage('Invalid subscription id'),
  body('amount')
    .optional({ values: 'null' })
    .isInt({ min: 1, max: 100 })
    .withMessage('Usage increment must be between 1 and 100')
    .toInt(),
  body('note')
    .optional({ values: 'falsy' })
    .isString()
    .withMessage('Note must be text')
    .isLength({ max: 200 })
    .withMessage('Note must be 200 characters or fewer')
    .trim(),
];

export const usageSetRules = [
  param('id').isMongoId().withMessage('Invalid subscription id'),
  body('count')
    .exists({ values: 'null' })
    .withMessage('Usage count is required')
    .bail()
    .isInt({ min: 0, max: 100000 })
    .withMessage('Usage count must be a whole number of 0 or more')
    .toInt(),
];

export const idParamRules = [
  param('id').isMongoId().withMessage('Invalid subscription id'),
];

export const logIdParamRules = [
  param('id').isMongoId().withMessage('Invalid subscription id'),
  param('logId').isMongoId().withMessage('Invalid log entry id'),
];

// Cancelling may backdate the end date, so the "not before the billing date"
// rule used by the edit form does not apply here.
export const cancelSubscriptionRules = [
  param('id').isMongoId().withMessage('Invalid subscription id'),
  body('endDate')
    .optional({ values: 'falsy' })
    .isISO8601({ strict: true })
    .withMessage('End date must be a valid date (YYYY-MM-DD)')
    .toDate(),
];
