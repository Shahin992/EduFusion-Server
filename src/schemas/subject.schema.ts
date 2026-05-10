import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true, versionKey: false })
export class Subject extends Document {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  code: string;

  @Prop({ type: Types.ObjectId, ref: 'Institute', required: true })
  instituteId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'AcademicClass', required: true })
  classId: Types.ObjectId;
}

export const SubjectSchema = SchemaFactory.createForClass(Subject);
SubjectSchema.index({ classId: 1, name: 1 }, { unique: true });
SubjectSchema.index({ classId: 1, code: 1 }, { unique: true });
