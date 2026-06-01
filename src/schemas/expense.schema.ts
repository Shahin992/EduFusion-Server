import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { Institute } from './institute.schema';

@Schema({ timestamps: true, versionKey: false, collection: 'EXPENSES' })
export class Expense extends Document {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Institute', required: true })
  instituteId: Institute;

  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  amount: number;

  @Prop({ required: true })
  category: string;

  @Prop({ required: true, default: Date.now })
  date: Date;

  @Prop()
  description: string;
}

export const ExpenseSchema = SchemaFactory.createForClass(Expense);
