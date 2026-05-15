import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ImportJobDocument = ImportJob & Document;

@Schema({ timestamps: true, collection: 'IMPORT_JOBS' })
export class ImportJob {
  @Prop({ required: true, type: Types.ObjectId, ref: 'Institute' })
  instituteId: Types.ObjectId;

  @Prop({ required: true })
  type: string; // e.g., 'students'

  @Prop()
  fileName?: string;

  @Prop({ required: true, enum: ['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED'] })
  status: string;

  @Prop({ default: 0 })
  totalRows: number;

  @Prop({ default: 0 })
  processedRows: number;

  @Prop({ default: 0 })
  successCount: number;

  @Prop({ default: 0 })
  failedCount: number;

  @Prop({ type: [{ row: Number, name: String, reason: String }] })
  errors: { row: number; name: string; reason: string }[];

  @Prop()
  completedAt?: Date;
}

export const ImportJobSchema = SchemaFactory.createForClass(ImportJob);
