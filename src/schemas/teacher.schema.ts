import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true, versionKey: false, collection: 'TEACHERS' })
export class Teacher extends Document {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  designation: string;

  @Prop()
  department: string;

  @Prop({ required: true, enum: ['Male', 'Female', 'Other'] })
  gender: string;

  @Prop()
  dateOfBirth: Date;

  @Prop({ required: true })
  email: string;

  @Prop({ required: true })
  phone: string;

  @Prop()
  address: string;

  @Prop()
  joiningDate: Date;

  @Prop()
  qualification: string;

  @Prop({ type: [String] })
  specializations: string[];

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Subject' }] })
  allocatedSubjects: Types.ObjectId[];

  @Prop()
  monthlySalary: string;

  @Prop({ default: 'Active', enum: ['Active', 'Inactive', 'On Leave', 'Resigned'] })
  status: string;

  @Prop()
  photoUrl: string;

  @Prop({ type: Types.ObjectId, ref: 'Institute', required: true })
  instituteId: Types.ObjectId;
}

export const TeacherSchema = SchemaFactory.createForClass(Teacher);
TeacherSchema.index({ instituteId: 1, email: 1 }, { unique: true });
TeacherSchema.index({ instituteId: 1, name: 1 });
TeacherSchema.index({ instituteId: 1, designation: 1 });
