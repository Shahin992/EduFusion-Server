import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { getQueueToken } from '@nestjs/bullmq';
import { ImportService } from './import.service';
import { ImportJob } from '../../schemas/import-job.schema';
import { Types } from 'mongoose';

describe('ImportService', () => {
  let service: ImportService;
  let model: any;
  let queue: any;

  const mockImportJob = {
    _id: new Types.ObjectId(),
    instituteId: new Types.ObjectId(),
    type: 'students',
    status: 'PENDING',
    totalRows: 2,
    save: jest.fn().mockImplementation(function() { return this; }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ImportService,
        {
          provide: getModelToken(ImportJob.name),
          useValue: jest.fn().mockImplementation(() => mockImportJob),
        },
        {
          provide: getQueueToken('import-queue'),
          useValue: {
            add: jest.fn().mockResolvedValue({ id: 'job-1' }),
          },
        },
      ],
    }).compile();

    service = module.get<ImportService>(ImportService);
    model = module.get(getModelToken(ImportJob.name));
    queue = module.get(getQueueToken('import-queue'));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should create an import job and add it to the queue', async () => {
    const instituteId = new Types.ObjectId().toString();
    const data = [{ name: 'Student 1' }, { name: 'Student 2' }];
    const mapping = { name: 'name' };
    const extraData = { classId: 'class-1' };

    const result = await service.createImportJob(instituteId, 'students', data, mapping, extraData);

    expect(result).toBeDefined();
    expect(queue.add).toHaveBeenCalledWith('process-import', expect.objectContaining({
      instituteId,
      data,
      mapping,
      extraData,
    }));
  });
});
