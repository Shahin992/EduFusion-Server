import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { Institute } from './institute.schema';
import { Student } from './student.schema';

@Schema({ timestamps: true, versionKey: false, collection: 'FEES' })
export class Fee extends Document {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Institute', required: true })
  instituteId: Institute;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Student', required: true })
  studentId: Student;

  @Prop({ required: true })
  totalAmount: number; // The expected total fee

  @Prop({ required: true })
  amount: number; // Paid amount

  @Prop({ required: true, default: 0 })
  dueAmount: number; // totalAmount - amount - discountAmount

  @Prop({ required: true, default: 0 })
  discountAmount: number; // Discount given

  @Prop()
  discountNote: string; // Reason for discount

  @Prop({ 
    required: true, 
    enum: ['Monthly', 'Admission', 'Exam', 'Transport', 'Other'],
    default: 'Monthly'
  })
  feeType: string;

  @Prop()
  month: string; // e.g., "January 2026"

  @Prop({ required: true, default: Date.now })
  paymentDate: Date;

  @Prop({ 
    required: true, 
    enum: ['Paid', 'Partial', 'Pending'],
    default: 'Paid'
  })
  status: string;

  @Prop({ required: true, unique: true })
  receiptNumber: string;

  @Prop()
  transactionId: string; // Groups fees paid together

  @Prop()
  note: string;

  @Prop({ type: [{
    amount: Number,
    discountAmount: Number,
    paymentDate: Date,
    transactionId: String,
    receiptNumber: String,
    note: String
  }], default: [] })
  paymentHistory: any[];
}

export const FeeSchema = SchemaFactory.createForClass(Fee);
