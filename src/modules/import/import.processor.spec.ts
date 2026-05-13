import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { ImportProcessor } from './import.processor';
import { ImportJob } from '../../schemas/import-job.schema';
import { StudentsService } from '../students/students.service';
import { Types } from 'mongoose';

describe('ImportProcessor', () => {
  let processor: ImportProcessor;
  let model: any;
  let studentsService: any;

  const mockImportJobModel = {
    findByIdAndUpdate: jest.fn().mockResolvedValue({}),
  };

  const mockStudentsService = {
    create: jest.fn().mockResolvedValue({}),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ImportProcessor,
        {
          provide: getModelToken(ImportJob.name),
          useValue: mockImportJobModel,
        },
        {
          provide: StudentsService,
          useValue: mockStudentsService,
        },
      ],
    }).compile();

    processor = module.get<ImportProcessor>(ImportProcessor);
    model = module.get(getModelToken(ImportJob.name));
    studentsService = module.get(StudentsService);
  });

  it('should process import data and call StudentsService.create', async () => {
    const job: any = {
      name: 'process-import',
      data: {
        jobId: new Types.ObjectId().toString(),
        instituteId: 'inst-1',
        data: [{ name: 'John Doe', roll: '101' }],
        mapping: { name: 'name', roll: 'rollNumber' },
        extraData: { classId: 'class-1', academicSessionId: 'sess-1' },
      },
    };

    await processor.process(job);

    expect(model.findByIdAndUpdate).toHaveBeenCalledWith(job.data.jobId, { status: 'PROCESSING' });
    expect(studentsService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'John Doe',
        rollNumber: '101',
        classId: 'class-1',
      }),
      'inst-1'
    );
    expect(model.findByIdAndUpdate).toHaveBeenCalledWith(job.data.jobId, expect.objectContaining({
      status: 'COMPLETED',
    }));
  });
});
