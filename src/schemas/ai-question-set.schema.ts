import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true, versionKey: false })
export class AIQuestionSet extends Document {
  @Prop({ type: Types.ObjectId, ref: 'Institute', required: true })
  instituteId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Teacher', required: true })
  teacherId: Types.ObjectId;

  @Prop({ required: true })
  name: string; // The Exam Name

  @Prop({ required: true })
  subject: string;

  @Prop({ required: true })
  className: string;

  @Prop({ default: 'English' })
  language: string;

  @Prop({ default: 'BOTH' })
  questionType: string;

  @Prop({ default: 'Medium' })
  difficulty: string;

  @Prop({ default: 100 })
  totalMarks: number;

  @Prop({ default: '2.5 Hours' })
  time: string;

  @Prop({ type: Array, required: true })
  questions: any[]; // Array of MCQ and Creative questions

  @Prop({ enum: ['Draft', 'Approved', 'Finalized'], default: 'Draft' })
  status: string;
}

export const AIQuestionSetSchema = SchemaFactory.createForClass(AIQuestionSet);
