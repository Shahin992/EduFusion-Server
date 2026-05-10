import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true, versionKey: false })
export class Exam extends Document {
  @Prop({ required: true })
  name: string; // e.g., "Annual Examination 2026"

  @Prop({ type: Types.ObjectId, ref: 'AcademicClass', required: true })
  classId: Types.ObjectId;

  @Prop([{
    subjectId: { type: Types.ObjectId, ref: 'Subject', required: true },
    totalMarks: { type: Number, required: true }
  }])
  subjects: { subjectId: Types.ObjectId; totalMarks: number }[];

  @Prop({ required: true })
  startDate: Date;

  @Prop({ required: true })
  endDate: Date;

  @Prop({ default: false })
  resultPublished: boolean;

  @Prop({ type: Types.ObjectId, ref: 'Institute', required: true })
  instituteId: Types.ObjectId;
}

export const ExamSchema = SchemaFactory.createForClass(Exam);
