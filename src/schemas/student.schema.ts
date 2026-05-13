import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true, versionKey: false, collection: 'STUDENTS' })
export class Student extends Document {
  @Prop({ required: true })
  name: string;

  @Prop()
  rollNumber: string;

  @Prop()
  registrationNumber: string;

  @Prop({ enum: ['Male', 'Female', 'Other'], default: 'Male' })
  gender: string;

  @Prop()
  dateOfBirth: Date;

  @Prop()
  bloodGroup: string;

  @Prop()
  religion: string;

  @Prop()
  email: string;

  @Prop()
  phone: string;

  @Prop()
  address: string;

  @Prop()
  fatherName: string;

  @Prop()
  fatherPhone: string;

  @Prop()
  motherName: string;

  @Prop()
  motherPhone: string;

  @Prop()
  guardianName: string; // Keeping for compatibility

  @Prop()
  guardianPhone: string; // Keeping for compatibility

  @Prop()
  instituteName: string;

  @Prop()
  monthlyFees: string;

  @Prop({ type: Types.ObjectId, ref: 'AcademicSession' })
  academicSessionId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'AcademicClass', required: true })
  classId: Types.ObjectId;

  @Prop({ default: 'Active', enum: ['Active', 'Inactive', 'Suspended', 'Graduated'] })
  status: string;

  @Prop()
  photoUrl: string;

  @Prop({ type: Types.ObjectId, ref: 'Institute', required: true })
  instituteId: Types.ObjectId;
}

export const StudentSchema = SchemaFactory.createForClass(Student);
// Indexes (removing unique constraint for roll if it's auto-generated and might conflict during race conditions, but service handles it)
StudentSchema.index({ instituteId: 1, academicSessionId: 1, classId: 1, rollNumber: 1 }, { unique: true });
StudentSchema.index({ instituteId: 1, registrationNumber: 1 }, { unique: true });
