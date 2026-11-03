import mongoose from 'mongoose';
import { BILLING_CYCLES, CATEGORIES } from '../utils/constants.js';
import { computeNextRenewal } from '../utils/renewal.js';

const usageLogSchema = new mongoose.Schema(
  {
    amount: {
      type: Number,
      required: true,
      min: [1, 'Amount must be at least 1'],
      default: 1,
    },
    note: {
      type: String,
      trim: true,
      maxlength: [200, 'Note must be 200 characters or fewer'],
      default: '',
    },
    recordedAt: {
      type: Date,
      default: () => new Date(),
    },
  },
  { _id: true }
);

const subscriptionSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: [80, 'Name must be 80 characters or fewer'],
    },
    service: {
      type: String,
      required: [true, 'Service is required'],
      trim: true,
      maxlength: [80, 'Service must be 80 characters or fewer'],
    },
    category: {
      type: String,
      enum: {
        values: CATEGORIES,
        message: `Category must be one of: ${CATEGORIES.join(', ')}`,
      },
      default: 'Other',
    },
    cost: {
      type: Number,
      required: [true, 'Cost is required'],
      min: [0.01, 'Cost must be greater than 0'],
      max: [10000000, 'Cost is unrealistically high'],
    },
    billingCycle: {
      type: String,
      enum: {
        values: BILLING_CYCLES,
        message: 'Billing cycle must be monthly, quarterly or yearly',
      },
      default: 'monthly',
    },
    billingDate: {
      type: Date,
      required: [true, 'Billing date is required'],
    },
    endDate: {
      type: Date,
      default: null,
    },
    nextRenewalDate: {
      type: Date,
      required: true,
    },
    usageCount: {
      type: Number,
      default: 0,
      min: [0, 'Usage count cannot be negative'],
    },
    lastUsedAt: {
      type: Date,
      default: null,
    },
    /** Chronological log of individual-use events. */
    usageLogs: {
      type: [usageLogSchema],
      default: [],
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      versionKey: false,
      transform: (_doc, ret) => {
        ret.id = String(ret._id);
        delete ret._id;
        // Normalise sub-document ids too
        if (Array.isArray(ret.usageLogs)) {
          ret.usageLogs = ret.usageLogs.map((log) => {
            const l = { ...log };
            l.id = String(log._id ?? log.id);
            delete l._id;
            return l;
          });
        }
        return ret;
      },
    },
  }
);

subscriptionSchema.index({ nextRenewalDate: 1 });
subscriptionSchema.index({ category: 1 });

/**
 * The renewal date is always derived from the billing anchor + cycle, so a
 * stored value can never drift away from the schedule.
 */
subscriptionSchema.pre('validate', function syncNextRenewal(next) {
  if (this.billingDate && this.billingCycle) {
    this.nextRenewalDate = computeNextRenewal(this.billingDate, this.billingCycle);
  }
  next();
});

export default mongoose.model('Subscription', subscriptionSchema);
