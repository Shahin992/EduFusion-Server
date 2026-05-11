import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ImportJob, ImportJobDocument } from '../../schemas/import-job.schema';

@Injectable()
export class ImportService {
  constructor(
    @InjectQueue('import-queue') private importQueue: Queue,
    @InjectModel(ImportJob.name) private importJobModel: Model<ImportJobDocument>,
  ) {}

  async createImportJob(instituteId: string, type: string, data: any[], mapping: any, extraData: any) {
    const job = new this.importJobModel({
      instituteId: new Types.ObjectId(instituteId),
      type,
      status: 'PENDING',
      totalRows: data.length,
    });

    const savedJob = await job.save();

    await this.importQueue.add('process-import', {
      jobId: savedJob._id.toString(),
      instituteId,
      data,
      mapping,
      extraData,
    });

    return savedJob;
  }

  async getImportStatus(jobId: string, instituteId: string) {
    const job = await this.importJobModel.findOne({
      _id: new Types.ObjectId(jobId),
      instituteId: new Types.ObjectId(instituteId),
    });

    if (!job) {
      throw new NotFoundException('Import job not found');
    }

    return job;
  }
}
