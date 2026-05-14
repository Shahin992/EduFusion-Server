import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true, versionKey: false, collection: 'INSTITUTES' })
export class Institute extends Document {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true, unique: true })
  slug: string;

  @Prop()
  logoUrl: string;

  @Prop({ type: Object, default: {} })
  branding: {
    address?: string;
    phone?: string;
    email?: string;
    principalName?: string;
    principalSignatureUrl?: string;
  };

  @Prop({ type: Array, default: [] })
  gradingRules: {
    minMarks: number;
    maxMarks: number;
    grade: string;
    point: number;
  }[];

  @Prop({ type: Object, default: {} })
  config: any;

  @Prop({ default: 'trial' })
  subscriptionTier: string;

  @Prop()
  trialExpiresAt: Date;

  @Prop()
  subscriptionEndsAt: Date;

  @Prop({ default: false })
  isOnboarded: boolean;

  @Prop({ default: 0 })
  onboardingStep: number;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  adminId: Types.ObjectId;

  @Prop({ default: 1 })
  instituteCode: number; // For smart registration number (e.g. 05)
}

export const InstituteSchema = SchemaFactory.createForClass(Institute);
