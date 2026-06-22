import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true, versionKey: false, collection: 'WAHA_CAMPAIGNS' })
export class WahaCampaign extends Document {
  @Prop({ type: Types.ObjectId, ref: 'Institute', required: true })
  instituteId: Types.ObjectId;

  @Prop({ required: true })
  title: string;

  @Prop({ enum: ['ANNOUNCEMENT', 'FEE_REMINDER', 'GENERAL'], default: 'GENERAL' })
  type: string;

  @Prop({ enum: ['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED'], default: 'PENDING' })
  status: string;

  @Prop({ default: 0 })
  totalRecipients: number;

  @Prop({ default: 0 })
  successfulCount: number;

  @Prop({ default: 0 })
  failedCount: number;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  createdBy: Types.ObjectId;
}

export const WahaCampaignSchema = SchemaFactory.createForClass(WahaCampaign);
