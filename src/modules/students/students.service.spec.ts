import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { StudentsService } from './students.service';
import { Student } from '../../schemas/student.schema';
import { User } from '../../schemas/user.schema';
import { AcademicClass } from '../../schemas/academic-class.schema';
import { AcademicSession } from '../../schemas/academic-session.schema';
import { Institute } from '../../schemas/institute.schema';
import { Types } from 'mongoose';

describe('StudentsService', () => {
  let service: StudentsService;
  let studentModel: any;
  let classModel: any;
  let sessionModel: any;

  const mockStudent = {
    _id: new Types.ObjectId(),
    name: 'Test Student',
    rollNumber: '101',
    registrationNumber: 'REG-001',
    instituteId: new Types.ObjectId(),
    classId: new Types.ObjectId(),
    academicSessionId: new Types.ObjectId(),
  };

  const mockClass = {
    _id: mockStudent.classId,
    name: 'Class 1',
    instituteId: mockStudent.instituteId,
  };

  const mockSession = {
    _id: mockStudent.academicSessionId,
    name: '2026',
    instituteId: mockStudent.instituteId,
    isActive: true,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StudentsService,
        {
          provide: getModelToken(Student.name),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            countDocuments: jest.fn(),
            create: jest.fn(),
            save: jest.fn().mockImplementation(function() { return this; }),
            collation: jest.fn().mockReturnThis(),
            sort: jest.fn().mockReturnThis(),
            exec: jest.fn(),
          },
        },
        { provide: getModelToken(User.name), useValue: { create: jest.fn() } },
        { provide: getModelToken(AcademicClass.name), useValue: { findOne: jest.fn() } },
        { provide: getModelToken(AcademicSession.name), useValue: { findOne: jest.fn() } },
        { provide: getModelToken(Institute.name), useValue: { findOne: jest.fn() } },
      ],
    }).compile();

    service = module.get<StudentsService>(StudentsService);
    studentModel = module.get(getModelToken(Student.name));
    classModel = module.get(getModelToken(AcademicClass.name));
    sessionModel = module.get(getModelToken(AcademicSession.name));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return paginated students', async () => {
      const mockStudents = [mockStudent];
      jest.spyOn(studentModel, 'find').mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockStudents),
      } as any);
      jest.spyOn(studentModel, 'countDocuments').mockResolvedValue(1);

      const result = await service.findAll(mockStudent.instituteId.toString(), {});
      expect(result.students).toEqual(mockStudents);
      expect(result.total).toBe(1);
    });
  });

  describe('create', () => {
    it('should throw ConflictException if roll number exists', async () => {
      jest.spyOn(classModel, 'findOne').mockResolvedValue(mockClass);
      jest.spyOn(sessionModel, 'findOne').mockResolvedValue(mockSession);
      jest.spyOn(studentModel, 'findOne').mockResolvedValue(mockStudent); // Found existing roll

      const dto: any = {
        name: 'New Student',
        classId: mockClass._id.toString(),
        academicSessionId: mockSession._id.toString(),
        rollNumber: '101',
      };

      await expect(service.create(dto, mockStudent.instituteId.toString())).rejects.toThrow();
    });
  });
});
