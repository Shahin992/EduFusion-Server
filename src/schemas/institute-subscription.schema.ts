import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export enum SubscriptionStatus {
  TRIALING = 'trialing',
  ACTIVE = 'active',
  PAST_DUE = 'past_due',
  CANCELED = 'canceled'
}

@Schema({ timestamps: true, versionKey: false, collection: 'INSTITUTESUBSCRIPTIONS' })
export class InstituteSubscription extends Document {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Institute', required: true, unique: true })
  instituteId: MongooseSchema.Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'SubscriptionPlan', required: true })
  planId: MongooseSchema.Types.ObjectId;

  @Prop({ enum: SubscriptionStatus, default: SubscriptionStatus.TRIALING })
  status: SubscriptionStatus;

  @Prop({ required: true })
  currentPeriodStart: Date;

  @Prop({ required: true })
  currentPeriodEnd: Date;

  @Prop({ default: false })
  cancelAtPeriodEnd: boolean;
}

export const InstituteSubscriptionSchema = SchemaFactory.createForClass(InstituteSubscription);
