import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { SubscriptionPlan } from '../../schemas/subscription-plan.schema';
import { InstituteSubscription, SubscriptionStatus } from '../../schemas/institute-subscription.schema';
import { BillingTransaction, TransactionStatus } from '../../schemas/billing-transaction.schema';
import { Institute } from '../../schemas/institute.schema';

@Injectable()
export class BillingService {
  constructor(
    @InjectModel(SubscriptionPlan.name) private planModel: Model<SubscriptionPlan>,
    @InjectModel(InstituteSubscription.name) private subscriptionModel: Model<InstituteSubscription>,
    @InjectModel(BillingTransaction.name) private transactionModel: Model<BillingTransaction>,
    @InjectModel(Institute.name) private instituteModel: Model<Institute>
  ) {}

  // --- Super Admin Methods ---
  async createPlan(data: any) {
    return this.planModel.create(data);
  }

  async updatePlan(id: string, data: any) {
    return this.planModel.findByIdAndUpdate(id, data, { new: true });
  }

  async getAllPlans(includeInactive = false) {
    const query = includeInactive ? {} : { isActive: true };
    return this.planModel.find(query);
  }

  async getPendingVerifications() {
    return this.transactionModel.find({ status: TransactionStatus.PENDING_VERIFICATION })
      .populate('instituteId', 'name email phone')
      .populate('planId', 'name priceMonthly')
      .sort({ createdAt: -1 });
  }

  async verifyTransaction(transactionId: string, approve: boolean) {
    const transaction = await this.transactionModel.findById(transactionId);
    if (!transaction) throw new NotFoundException('Transaction not found');
    if (transaction.status !== TransactionStatus.PENDING_VERIFICATION) {
      throw new BadRequestException('Transaction is not pending verification');
    }

    if (!approve) {
      transaction.status = TransactionStatus.FAILED;
      await transaction.save();
      return { message: 'Transaction rejected' };
    }

    // Approve transaction
    transaction.status = TransactionStatus.SUCCEEDED;
    await transaction.save();

    // Activate/Extend Subscription
    const plan = await this.planModel.findById(transaction.planId);
    let subscription = await this.subscriptionModel.findOne({ instituteId: transaction.instituteId });

    const now = new Date();
    // Example logic: Extend by 1 month. In reality, you'd check if they paid for monthly or yearly.
    const endDate = new Date(now);
    endDate.setMonth(endDate.getMonth() + 1);

    if (!subscription) {
      subscription = new this.subscriptionModel({
        instituteId: transaction.instituteId,
        planId: plan._id,
        status: SubscriptionStatus.ACTIVE,
        currentPeriodStart: now,
        currentPeriodEnd: endDate,
      });
    } else {
      subscription.planId = plan._id;
      subscription.status = SubscriptionStatus.ACTIVE;
      // If already active and not expired, extend from current end date
      if (subscription.currentPeriodEnd > now) {
        subscription.currentPeriodEnd.setMonth(subscription.currentPeriodEnd.getMonth() + 1);
      } else {
        subscription.currentPeriodStart = now;
        subscription.currentPeriodEnd = endDate;
      }
    }

    await subscription.save();

    // Update the Institute document to sync dates for the /me API
    await this.instituteModel.findByIdAndUpdate(transaction.instituteId, {
      subscriptionTier: plan.name.toLowerCase(),
      subscriptionEndsAt: subscription.currentPeriodEnd,
      isActive: true
    });

    return { message: 'Transaction approved and subscription activated' };
  }

  // --- Institute Methods ---
  async getCurrentSubscription(instituteId: string) {
    let sub = await this.subscriptionModel.findOne({ instituteId }).populate('planId');
    if (!sub) {
      // Return null or trial fallback if necessary
      return null;
    }
    return sub;
  }

  async submitPayment(instituteId: string, data: any) {
    const transaction = new this.transactionModel({
      instituteId,
      planId: data.planId,
      amountPaid: data.amount,
      paymentMethod: data.paymentMethod,
      transactionId: data.transactionId,
      reference: data.reference,
      status: TransactionStatus.PENDING_VERIFICATION
    });
    return transaction.save();
  }

  async getInstituteTransactions(instituteId: string) {
    return this.transactionModel.find({ instituteId }).populate('planId', 'name').sort({ createdAt: -1 });
  }
}
