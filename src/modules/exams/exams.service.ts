import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Exam } from '../../schemas/exam.schema';
import { ExamSchedule } from '../../schemas/exam-schedule.schema';
import { AcademicClass } from '../../schemas/academic-class.schema';
import { AcademicSession } from '../../schemas/academic-session.schema';
import { Subject } from '../../schemas/subject.schema';
import { CreateExamDto } from './dto/create-exam.dto';
import { UpdateExamDto } from './dto/update-exam.dto';
import { BulkCreateScheduleDto } from './dto/bulk-create-schedule.dto';

@Injectable()
export class ExamsService {
  constructor(
    @InjectModel(Exam.name) private examModel: Model<Exam>,
    @InjectModel(ExamSchedule.name) private scheduleModel: Model<ExamSchedule>,
    @InjectModel(AcademicClass.name) private classModel: Model<AcademicClass>,
    @InjectModel(AcademicSession.name) private sessionModel: Model<AcademicSession>,
    @InjectModel(Subject.name) private subjectModel: Model<Subject>,
  ) {}

  async create(createExamDto: CreateExamDto, instituteId: string): Promise<Exam> {
    const instId = new Types.ObjectId(instituteId);
    
    // 1. Date Validation
    const start = new Date(createExamDto.startDate);
    const end = new Date(createExamDto.endDate);
    if (start > end) {
      throw new BadRequestException('Start date cannot be after end date');
    }

    // 2. Class Validation
    const targetClass = await this.classModel.findOne({ 
      _id: new Types.ObjectId(createExamDto.classId), 
      instituteId: instId 
    });
    if (!targetClass) {
      throw new BadRequestException('Selected class not found or unauthorized');
    }

    const createdExam = new this.examModel({
      ...createExamDto,
      instituteId: instId,
    });

    const savedExam = await createdExam.save();

    // If subjects are provided, also create schedules for detailed tracking
    if (createExamDto.subjects && createExamDto.subjects.length > 0) {
      const schedules = createExamDto.subjects.map((item) => ({
        examId: savedExam._id,
        classId: new Types.ObjectId(createExamDto.classId),
        subjectId: new Types.ObjectId(item.subjectId),
        totalMarks: item.totalMarks,
        examDate: savedExam.startDate,
        startTime: '09:00 AM',
        endTime: '12:00 PM',
        instituteId: instId,
      }));

      await this.scheduleModel.insertMany(schedules);
    }

    return savedExam;
  }

  async findAll(instituteId: string, classId?: string) {
    const query: any = { instituteId: new Types.ObjectId(instituteId) };
    if (classId) {
      query.classId = new Types.ObjectId(classId);
    }

    return this.examModel
      .find(query)
      .populate('classId', 'name')
      .populate('subjects.subjectId', 'name')
      .sort({ createdAt: -1 })
      .exec();
  }

  async findActive(instituteId: string) {
    const today = new Date();
    return this.examModel
      .find({
        instituteId: new Types.ObjectId(instituteId),
        endDate: { $gte: today },
      })
      .populate('classId', 'name')
      .populate('subjects.subjectId', 'name')
      .sort({ createdAt: -1 })
      .exec();
  }

  async findOne(id: string, instituteId: string) {
    const exam = await this.examModel.findOne({
      _id: new Types.ObjectId(id),
      instituteId: new Types.ObjectId(instituteId),
    })
    .populate('classId', 'name')
    .populate('subjects.subjectId', 'name');

    if (!exam) throw new NotFoundException('Exam not found');
    return exam;
  }

  async update(id: string, updateExamDto: UpdateExamDto, instituteId: string): Promise<Exam> {
    const instId = new Types.ObjectId(instituteId);
    const examId = new Types.ObjectId(id);

    // Verify exam exists and belongs to institute
    const existingExam = await this.examModel.findOne({ _id: examId, instituteId: instId });
    if (!existingExam) throw new NotFoundException('Exam not found');

    // 1. Date Validation (if dates are being updated)
    const startDate = updateExamDto.startDate || existingExam.startDate;
    const endDate = updateExamDto.endDate || existingExam.endDate;
    
    if (new Date(startDate) > new Date(endDate)) {
      throw new BadRequestException('Start date cannot be after end date');
    }

    // Update Exam document
    const updatedExam = await this.examModel.findByIdAndUpdate(
      examId,
      { $set: updateExamDto },
      { new: true }
    )
    .populate('classId', 'name')
    .populate('subjects.subjectId', 'name');

    // Synchronize schedules if classId and subjects are updated
    if (updateExamDto.classId && updateExamDto.subjects) {
      // Clear old schedules
      await this.scheduleModel.deleteMany({ examId, instituteId: instId });

      // Create new schedules
      const schedules = updateExamDto.subjects.map((item) => ({
        examId,
        classId: new Types.ObjectId(updateExamDto.classId),
        subjectId: new Types.ObjectId(item.subjectId),
        totalMarks: item.totalMarks,
        examDate: updatedExam.startDate,
        startTime: '09:00 AM',
        endTime: '12:00 PM',
        instituteId: instId,
      }));

      await this.scheduleModel.insertMany(schedules);
    }

    return updatedExam;
  }

  async remove(id: string, instituteId: string) {
    const instId = new Types.ObjectId(instituteId);
    const examId = new Types.ObjectId(id);

    const exam = await this.examModel.findOne({ _id: examId, instituteId: instId });
    if (!exam) throw new NotFoundException('Exam not found');

    // Delete schedules first
    await this.scheduleModel.deleteMany({ examId, instituteId: instId });
    
    // Delete exam
    return this.examModel.deleteOne({ _id: examId, instituteId: instId });
  }

  async bulkCreateSchedule(bulkDto: BulkCreateScheduleDto, instituteId: string) {
    const instId = new Types.ObjectId(instituteId);
    const examId = new Types.ObjectId(bulkDto.examId);
    const classId = new Types.ObjectId(bulkDto.classId);

    // Verify exam and class belong to institute
    const [exam, targetClass] = await Promise.all([
      this.examModel.findOne({ _id: examId, instituteId: instId }),
      this.classModel.findOne({ _id: classId, instituteId: instId }),
    ]);

    if (!exam) throw new NotFoundException('Exam not found');
    if (!targetClass) throw new NotFoundException('Class not found');

    const schedules = bulkDto.schedules.map((item) => ({
      ...item,
      examId,
      classId,
      subjectId: new Types.ObjectId(item.subjectId),
      instituteId: instId,
    }));

    // Clear existing schedules for this exam and class to avoid duplicates
    await this.scheduleModel.deleteMany({ examId, classId, instituteId: instId });

    return this.scheduleModel.insertMany(schedules);
  }

  async getSchedule(examId: string, instituteId: string) {
    return this.scheduleModel
      .find({
        examId: new Types.ObjectId(examId),
        instituteId: new Types.ObjectId(instituteId),
      })
      .populate('classId', 'name')
      .populate('subjectId', 'name')
      .sort({ examDate: 1, startTime: 1 })
      .exec();
  }
}
