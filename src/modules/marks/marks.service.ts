import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Mark } from '../../schemas/mark.schema';
import { ExamSchedule } from '../../schemas/exam-schedule.schema';
import { Institute } from '../../schemas/institute.schema';
import { BulkUpsertMarksDto } from './dto/bulk-upsert-marks.dto';

@Injectable()
export class MarksService {
  constructor(
    @InjectModel(Mark.name) private markModel: Model<Mark>,
    @InjectModel(ExamSchedule.name) private scheduleModel: Model<ExamSchedule>,
    @InjectModel(Institute.name) private instituteModel: Model<Institute>,
  ) {}

  async bulkUpsert(bulkDto: BulkUpsertMarksDto, instituteId: string) {
    const instId = new Types.ObjectId(instituteId);
    const examId = new Types.ObjectId(bulkDto.examId);
    const subjectId = new Types.ObjectId(bulkDto.subjectId);
    const classId = new Types.ObjectId(bulkDto.classId);

    // Get grading rules and total marks
    const [institute, schedule] = await Promise.all([
      this.instituteModel.findById(instId),
      this.scheduleModel.findOne({ examId, subjectId, classId, instituteId: instId }),
    ]);

    if (!institute) throw new NotFoundException('Institute not found');
    if (!schedule) throw new NotFoundException('Exam schedule not found for this subject/class');

    const gradingRules = institute.gradingRules || [];
    const totalMarks = schedule.totalMarks;

    const bulkOps = bulkDto.marks.map((item) => {
      const percentage = (item.marksObtained / totalMarks) * 100;
      
      // Calculate grade and GPA
      let grade = 'F';
      let gpa = 0;

      for (const rule of gradingRules) {
        if (percentage >= rule.minMarks && percentage <= rule.maxMarks) {
          grade = rule.grade;
          gpa = rule.point;
          break;
        }
      }

      const markData = {
        studentId: new Types.ObjectId(item.studentId),
        examId,
        subjectId,
        classId,
        marksObtained: item.marksObtained,
        totalMarks,
        grade,
        gpa,
        status: item.status,
        comments: item.comments,
        instituteId: instId,
      };

      return {
        updateOne: {
          filter: {
            studentId: markData.studentId,
            examId,
            subjectId,
            instituteId: instId,
          },
          update: { $set: markData },
          upsert: true,
        },
      };
    });

    return this.markModel.bulkWrite(bulkOps);
  }

  async studentWiseUpsert(dto: any, instituteId: string) {
    const instId = new Types.ObjectId(instituteId);
    const examId = new Types.ObjectId(dto.examId);
    const studentId = new Types.ObjectId(dto.studentId);
    const classId = new Types.ObjectId(dto.classId);

    const institute = await this.instituteModel.findById(instId);
    if (!institute) throw new NotFoundException('Institute not found');
    const gradingRules = institute.gradingRules || [];

    const bulkOps = await Promise.all(
      dto.marks.map(async (item: any) => {
        const subjectId = new Types.ObjectId(item.subjectId);
        const schedule = await this.scheduleModel.findOne({
          examId,
          subjectId,
          classId,
          instituteId: instId,
        });

        if (!schedule) return null;

        const totalMarks = schedule.totalMarks;
        const percentage = (item.marksObtained / totalMarks) * 100;

        let grade = 'F';
        let gpa = 0;

        for (const rule of gradingRules) {
          if (percentage >= rule.minMarks && percentage <= rule.maxMarks) {
            grade = rule.grade;
            gpa = rule.point;
            break;
          }
        }

        const markData = {
          studentId,
          examId,
          subjectId,
          classId,
          marksObtained: item.marksObtained,
          totalMarks,
          grade,
          gpa,
          status: item.status,
          comments: item.comments,
          instituteId: instId,
        };

        return {
          updateOne: {
            filter: {
              studentId,
              examId,
              subjectId,
              instituteId: instId,
            },
            update: { $set: markData },
            upsert: true,
          },
        };
      })
    );

    const validOps = bulkOps.filter((op) => op !== null);
    if (validOps.length === 0) return { matchedCount: 0 };
    return this.markModel.bulkWrite(validOps as any);
  }

  async findByExamAndClass(examId: string, classId?: string, subjectId?: string, instituteId?: string) {
    const filter: any = {
      examId: new Types.ObjectId(examId),
      instituteId: new Types.ObjectId(instituteId),
    };

    if (classId) filter.classId = new Types.ObjectId(classId);
    if (subjectId) filter.subjectId = new Types.ObjectId(subjectId);

    return this.markModel
      .find(filter)
      .populate('studentId', 'name rollNumber')
      .populate('subjectId', 'name')
      .exec();
  }

  async getStudentReport(studentId: string, examId: string, instituteId: string) {
    const marks = await this.markModel
      .find({
        studentId: new Types.ObjectId(studentId),
        examId: new Types.ObjectId(examId),
        instituteId: new Types.ObjectId(instituteId),
      })
      .populate('subjectId', 'name')
      .populate('examId', 'name type')
      .exec();
    
    return marks;
  }

  async clearStudentMarks(studentId: string, examId: string, instituteId: string) {
    return this.markModel.deleteMany({
      studentId: new Types.ObjectId(studentId),
      examId: new Types.ObjectId(examId),
      instituteId: new Types.ObjectId(instituteId),
    });
  }
}
