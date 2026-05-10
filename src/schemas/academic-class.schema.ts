import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true, versionKey: false })
export class AcademicClass extends Document {
  @Prop({ required: true })
  name: string; // e.g. "Class 7"

  @Prop({ type: Types.ObjectId, ref: 'Institute', required: true })
  instituteId: Types.ObjectId;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Subject' }] })
  subjects: Types.ObjectId[];
}

export const AcademicClassSchema = SchemaFactory.createForClass(AcademicClass);
AcademicClassSchema.index({ instituteId: 1, name: 1 }, { unique: true });
