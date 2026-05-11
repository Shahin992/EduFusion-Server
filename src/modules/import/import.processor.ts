import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ImportJob, ImportJobDocument } from '../../schemas/import-job.schema';
import { StudentsService } from '../students/students.service';

@Processor('import-queue')
export class ImportProcessor extends WorkerHost {
  constructor(
    @InjectModel(ImportJob.name) private importJobModel: Model<ImportJobDocument>,
    private readonly studentsService: StudentsService,
  ) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    if (job.name === 'process-import') {
      const { jobId, instituteId, data, mapping, extraData } = job.data;

      await this.importJobModel.findByIdAndUpdate(jobId, { status: 'PROCESSING' });

      let successCount = 0;
      let failedCount = 0;
      const errors = [];

      for (let i = 0; i < data.length; i++) {
        const row = data[i];
        try {
          // Map CSV row to CreateStudentDto using the mapping object
          const payload: any = {
            classId: extraData.classId,
            academicSessionId: extraData.academicSessionId,
          };

          // Apply mapping
          Object.keys(mapping).forEach((csvHeader) => {
            const systemField = mapping[csvHeader];
            if (systemField && row[csvHeader]) {
              payload[systemField] = row[csvHeader];
            }
          });

          // Process row
          await this.studentsService.create(payload, instituteId);
          successCount++;
        } catch (error) {
          failedCount++;
          errors.push({
            row: i + 2, // +1 for 0-index, +1 for header
            name: row[Object.keys(mapping).find(k => mapping[k] === 'name')] || 'Unknown',
            reason: error.message || 'Import failed',
          });
        }

        // Update progress every 10 rows
        if (i % 10 === 0 || i === data.length - 1) {
          await this.importJobModel.findByIdAndUpdate(jobId, {
            processedRows: i + 1,
            successCount,
            failedCount,
            errors,
          });
        }
      }

      await this.importJobModel.findByIdAndUpdate(jobId, {
        status: 'COMPLETED',
        completedAt: new Date(),
      });

      return { successCount, failedCount };
    }
  }
}
