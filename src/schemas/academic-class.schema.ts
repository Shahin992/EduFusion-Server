import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true, versionKey: false, collection: 'ACADEMIC_CLASSES' })
export class AcademicClass extends Document {
  @Prop({ required: true })
  name: string; // e.g. "Class 7"

  @Prop({ type: Types.ObjectId, ref: 'Institute', required: true })
  instituteId: Types.ObjectId;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Subject' }] })
  subjects: Types.ObjectId[];

  @Prop({ default: 0 })
  monthlyFee: number; // Base monthly fee for this class

  @Prop({ default: 1 })
  classCode: number; // For smart registration number (e.g. 08)
}

export const AcademicClassSchema = SchemaFactory.createForClass(AcademicClass);
AcademicClassSchema.index({ instituteId: 1, name: 1 }, { unique: true });
