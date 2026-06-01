import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { Institute } from './institute.schema';
import { Teacher } from './teacher.schema';

@Schema({ timestamps: true, versionKey: false, collection: 'SALARIES' })
export class Salary extends Document {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Institute', required: true })
  instituteId: Institute;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Teacher', required: true })
  teacherId: Teacher;

  @Prop({ required: true })
  amountPaid: number;

  @Prop({ required: true })
  baseSalary: number;

  @Prop({ required: true, default: 0 })
  dueAmount: number;

  @Prop({ required: true })
  month: string; // e.g., "January 2026"

  @Prop({ required: true, default: Date.now })
  paymentDate: Date;

  @Prop({ 
    required: true, 
    enum: ['Paid', 'Partial', 'Pending'],
    default: 'Paid'
  })
  status: string;

  @Prop()
  note: string;
}

export const SalarySchema = SchemaFactory.createForClass(Salary);
