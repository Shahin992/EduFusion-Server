import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true, versionKey: false, collection: 'SUBSCRIPTIONPLANS' })
export class SubscriptionPlan extends Document {
  @Prop({ required: true })
  name: string; // e.g., 'Starter', 'Professional', 'Enterprise'

  @Prop({ required: true })
  priceMonthly: number;

  @Prop({ required: true })
  priceYearly: number;

  @Prop({ type: [String], default: [] })
  features: string[];

  @Prop({ required: true })
  maxStudents: number; // 0 means unlimited

  @Prop({ default: true })
  isActive: boolean; // Can it be purchased right now?
}

export const SubscriptionPlanSchema = SchemaFactory.createForClass(SubscriptionPlan);
