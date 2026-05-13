import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true, versionKey: false, collection: 'USERS' })
export class User extends Document {
  @Prop({ required: true, unique: true })
  email: string;

  @Prop({ required: true })
  passwordHash: string;

  @Prop({ required: true })
  name: string;

  @Prop()
  phone: string;

  @Prop()
  photoUrl: string;

  @Prop({ required: true, enum: ['super_admin', 'admin', 'teacher', 'student'] })
  role: string;

  @Prop({ type: Types.ObjectId, ref: 'Institute', required: false })
  instituteId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Student', required: false })
  studentId: Types.ObjectId;

  @Prop({ default: true })
  isActive: boolean;
}

export const UserSchema = SchemaFactory.createForClass(User);
