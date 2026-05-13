import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true, versionKey: false, collection: 'EXAM_SCHEDULES' })
export class ExamSchedule extends Document {
  @Prop({ type: Types.ObjectId, ref: 'Exam', required: true })
  examId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'AcademicClass', required: true })
  classId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Subject', required: true })
  subjectId: Types.ObjectId;

  @Prop({ required: true })
  examDate: Date;

  @Prop({ required: true })
  startTime: string; // "09:00 AM"

  @Prop({ required: true })
  endTime: string;

  @Prop({ required: true })
  totalMarks: number; // e.g., 100

  @Prop()
  roomNumber: string;

  @Prop({ type: Types.ObjectId, ref: 'Institute', required: true })
  instituteId: Types.ObjectId;
}

export const ExamScheduleSchema = SchemaFactory.createForClass(ExamSchedule);
ExamScheduleSchema.index({ examId: 1, classId: 1, subjectId: 1 }, { unique: true });
