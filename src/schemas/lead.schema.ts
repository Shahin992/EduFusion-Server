import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true, versionKey: false })
export class Lead extends Document {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  email: string;

  @Prop()
  instituteName: string;

  @Prop({ required: true })
  message: string;

  @Prop({ default: 'pending' })
  status: string; // pending, contacted, closed
}

export const LeadSchema = SchemaFactory.createForClass(Lead);
