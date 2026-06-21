import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export enum PaymentMethod {
  BKASH = 'bKash',
  ROCKET = 'Rocket',
  NAGAD = 'Nagad',
  CARD = 'Card',
  BANK_TRANSFER = 'Bank Transfer'
}

export enum TransactionStatus {
  PENDING_VERIFICATION = 'pending_verification',
  SUCCEEDED = 'succeeded',
  FAILED = 'failed'
}

@Schema({ timestamps: true, versionKey: false, collection: 'BILLINGTRANSACTIONS' })
export class BillingTransaction extends Document {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Institute', required: true })
  instituteId: MongooseSchema.Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'SubscriptionPlan', required: true })
  planId: MongooseSchema.Types.ObjectId;

  @Prop({ required: true })
  amountPaid: number;

  @Prop({ default: 'BDT' })
  currency: string;

  @Prop({ enum: PaymentMethod, required: true })
  paymentMethod: PaymentMethod;

  @Prop({ required: true })
  transactionId: string; // The TXN ID provided by user for mobile banking

  @Prop()
  reference: string;

  @Prop({ enum: TransactionStatus, default: TransactionStatus.PENDING_VERIFICATION })
  status: TransactionStatus;

  @Prop()
  invoiceUrl: string;
}

export const BillingTransactionSchema = SchemaFactory.createForClass(BillingTransaction);
