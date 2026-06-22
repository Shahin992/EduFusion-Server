import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true, versionKey: false, collection: 'WAHA_MESSAGE_LOGS' })
export class WahaMessageLog extends Document {
  @Prop({ type: Types.ObjectId, ref: 'WahaCampaign', required: true })
  campaignId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Institute', required: true })
  instituteId: Types.ObjectId;

  @Prop({ required: true })
  recipientNumber: string;

  @Prop()
  recipientName: string;

  @Prop({ required: true })
  messageContent: string;

  @Prop({ enum: ['PENDING', 'SENT', 'FAILED'], default: 'PENDING' })
  status: string;

  @Prop()
  errorMessage: string;

  @Prop()
  sentAt: Date;
}

export const WahaMessageLogSchema = SchemaFactory.createForClass(WahaMessageLog);
