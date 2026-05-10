import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true, versionKey: false })
export class AIQuestion extends Document {
  @Prop({ type: Types.ObjectId, ref: 'Institute', required: true })
  instituteId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Teacher', required: true })
  teacherId: Types.ObjectId;

  @Prop({ required: true })
  subject: string;

  @Prop()
  className: string;

  @Prop({ type: Object, required: true })
  content: any; // The question text, options, answer, etc.

  @Prop({ enum: ['Draft', 'Approved'], default: 'Draft' })
  status: string;

  @Prop({ enum: ['MCQ', 'Creative'] })
  type: string;
}

export const AIQuestionSchema = SchemaFactory.createForClass(AIQuestion);
