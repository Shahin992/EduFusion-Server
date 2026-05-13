import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true, versionKey: false, collection: 'ACADEMIC_SESSIONS' })
export class AcademicSession extends Document {
  @Prop({ required: true })
  name: string; // e.g. "2026-2027"

  @Prop({ type: Types.ObjectId, ref: 'Institute', required: true })
  instituteId: Types.ObjectId;

  @Prop({ default: false })
  isActive: boolean;

  @Prop({ type: Date })
  startDate: Date;

  @Prop({ type: Date })
  endDate: Date;
}

export const AcademicSessionSchema = SchemaFactory.createForClass(AcademicSession);
AcademicSessionSchema.index({ instituteId: 1, name: 1 }, { unique: true });
