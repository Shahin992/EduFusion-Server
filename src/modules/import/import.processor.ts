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

      let currentRollNumber = await this.studentsService.getLastRollNumber(
        instituteId,
        extraData.classId,
        extraData.academicSessionId
      );

      const chunkSize = 10;
      for (let i = 0; i < data.length; i += chunkSize) {
        const chunk = data.slice(i, i + chunkSize);

        const promises = chunk.map(async (row, chunkIndex) => {
          const actualIndex = i + chunkIndex;
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

            // Safely assign sequential roll number if not provided in CSV
            if (!payload.rollNumber) {
              currentRollNumber++;
              payload.rollNumber = currentRollNumber.toString();
            }

            // Process row
            await this.studentsService.create(payload, instituteId);
            return { status: 'fulfilled' };
          } catch (error) {
            return {
              status: 'rejected',
              row: actualIndex + 2, // +1 for 0-index, +1 for header
              name: row[Object.keys(mapping).find((k) => mapping[k] === 'name')] || 'Unknown',
              reason: error.message || 'Import failed',
            };
          }
        });

        const results = await Promise.all(promises);

        results.forEach((result) => {
          if (result.status === 'fulfilled') {
            successCount++;
          } else {
            failedCount++;
            errors.push({
              row: result.row,
              name: result.name,
              reason: result.reason,
            });
          }
        });

        // Update progress every chunk
        await this.importJobModel.findByIdAndUpdate(jobId, {
          processedRows: Math.min(i + chunkSize, data.length),
          successCount,
          failedCount,
          errors,
        });
      }

      await this.importJobModel.findByIdAndUpdate(jobId, {
        status: 'COMPLETED',
        completedAt: new Date(),
      });

      return { successCount, failedCount };
    }
  }
}
