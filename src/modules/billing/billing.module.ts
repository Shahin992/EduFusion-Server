import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BillingService } from './billing.service';
import { BillingController } from './billing.controller';
import { SubscriptionPlan, SubscriptionPlanSchema } from '../../schemas/subscription-plan.schema';
import { InstituteSubscription, InstituteSubscriptionSchema } from '../../schemas/institute-subscription.schema';
import { BillingTransaction, BillingTransactionSchema } from '../../schemas/billing-transaction.schema';
import { Institute, InstituteSchema } from '../../schemas/institute.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: SubscriptionPlan.name, schema: SubscriptionPlanSchema },
      { name: InstituteSubscription.name, schema: InstituteSubscriptionSchema },
      { name: BillingTransaction.name, schema: BillingTransactionSchema },
      { name: Institute.name, schema: InstituteSchema }
    ])
  ],
  providers: [BillingService],
  controllers: [BillingController],
  exports: [BillingService]
})
export class BillingModule {}
