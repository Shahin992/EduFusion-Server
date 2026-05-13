import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true, versionKey: false, collection: 'MARKS' })
export class Mark extends Document {
  @Prop({ type: Types.ObjectId, ref: 'Student', required: true })
  studentId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Exam', required: true })
  examId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Subject', required: true })
  subjectId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'AcademicClass', required: true })
  classId: Types.ObjectId;

  @Prop({ required: true })
  marksObtained: number;

  @Prop({ required: true })
  totalMarks: number;

  @Prop()
  grade: string;

  @Prop()
  gpa: number;

  @Prop({ 
    required: true, 
    enum: ['Present', 'Absent', 'Expelled'], 
    default: 'Present' 
  })
  status: string;

  @Prop()
  comments: string;

  @Prop({ type: Types.ObjectId, ref: 'Institute', required: true })
  instituteId: Types.ObjectId;
}

export const MarkSchema = SchemaFactory.createForClass(Mark);
MarkSchema.index({ studentId: 1, examId: 1, subjectId: 1 }, { unique: true });
