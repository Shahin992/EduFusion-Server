import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Mark } from '../../schemas/mark.schema';
import { Institute } from '../../schemas/institute.schema';
import { Exam } from '../../schemas/exam.schema';
import { Student } from '../../schemas/student.schema';

@Injectable()
export class ResultsService {
  constructor(
    @InjectModel(Mark.name) private markModel: Model<Mark>,
    @InjectModel(Institute.name) private instituteModel: Model<Institute>,
    @InjectModel(Exam.name) private examModel: Model<Exam>,
    @InjectModel(Student.name) private studentModel: Model<Student>,
  ) {}

  async getClassResults(examId: string, classId: string, instituteId: string, page?: number, limit?: number, search?: string) {
    const instId = new Types.ObjectId(instituteId);
    const exId = new Types.ObjectId(examId);
    const clId = new Types.ObjectId(classId);

    const institute = await this.instituteModel.findById(instId);
    if (!institute) throw new NotFoundException('Institute not found');

    const exam = await this.examModel.findOne({ _id: exId, instituteId: instId });
    if (!exam) throw new NotFoundException('Exam not found');

    // Fetch all marks for this exam and class
    const marks = await this.markModel.find({
      examId: exId,
      classId: clId,
      instituteId: instId,
    }).populate('studentId subjectId');

    // Fetch all students in this class to ensure we include those without marks
    const students = await this.studentModel.find({
      classId: clId,
      instituteId: instId,
      status: 'Active',
    }).sort({ rollNumber: 1 });

    const gradingRules = institute.gradingRules || [];

    const results = students.map((student) => {
      const studentMarks = marks.filter(
        (m) => (m.studentId as any)._id.toString() === student._id.toString(),
      );

      return this.calculateStudentResult(student, studentMarks, gradingRules, exam);
    });

    // Rank students by GPA, then total marks
    let sortedResults = results.sort((a, b) => {
      if (b.gpa !== a.gpa) return b.gpa - a.gpa;
      return b.totalMarksObtained - a.totalMarksObtained;
    });

    if (search) {
      const lowerSearch = search.toLowerCase();
      sortedResults = sortedResults.filter(
        (r) =>
          r.studentName?.toLowerCase().includes(lowerSearch) ||
          r.rollNumber?.toString().includes(lowerSearch),
      );
    }

    if (page && limit) {
      const skip = (page - 1) * limit;
      const data = sortedResults.slice(skip, skip + limit);
      return { data, total: sortedResults.length, page, limit };
    }

    return sortedResults;
  }

  async getStudentResult(studentId: string, examId: string, instituteId: string, isStaff: boolean = false) {
    const instId = new Types.ObjectId(instituteId);
    const exId = new Types.ObjectId(examId);
    const stId = new Types.ObjectId(studentId);

    const institute = await this.instituteModel.findById(instId);
    if (!institute) throw new NotFoundException('Institute not found');

    const exam = await this.examModel.findOne({ _id: exId, instituteId: instId });
    const student = await this.studentModel.findOne({ _id: stId, instituteId: instId });

    if (!student || !exam) throw new NotFoundException('Student or Exam not found');

    // If not staff, check if results are published
    if (!isStaff && !exam.resultPublished) {
      throw new NotFoundException('Results for this exam have not been published yet');
    }

    const studentMarks = await this.markModel.find({
      studentId: stId,
      examId: exId,
      instituteId: instId,
    }).populate('subjectId');

    return this.calculateStudentResult(student, studentMarks, institute.gradingRules || [], exam);
  }

  private calculateStudentResult(student: any, marks: any[], gradingRules: any[], exam: any) {
    let totalMarksObtained = 0;
    let totalMaxMarks = 0;
    let totalPoints = 0;
    let subjectResults = [];
    let isFailed = false;

    // We should iterate over exam subjects to see what student missed
    exam.subjects.forEach((examSubject) => {
      const mark = marks.find(
        (m) => m.subjectId._id.toString() === examSubject.subjectId.toString(),
      );

      const obtained = mark ? mark.marksObtained : 0;
      const percentage = (obtained / examSubject.totalMarks) * 100;
      
      const gradeInfo = this.getGradeFromPercentage(percentage, gradingRules);
      
      if (gradeInfo.grade === 'F') isFailed = true;

      totalMarksObtained += obtained;
      totalMaxMarks += examSubject.totalMarks;
      totalPoints += gradeInfo.point;

      subjectResults.push({
        subjectName: mark?.subjectId?.name || 'Unknown',
        obtained,
        totalMarks: examSubject.totalMarks,
        grade: gradeInfo.grade,
        point: gradeInfo.point,
        status: mark?.status || 'Absent',
      });
    });

    const averagePercentage = totalMaxMarks > 0 ? (totalMarksObtained / totalMaxMarks) * 100 : 0;
    const finalGradeInfo = isFailed 
      ? { grade: 'F', point: 0 } 
      : this.getGradeFromPercentage(averagePercentage, gradingRules);

    return {
      studentId: student._id,
      studentName: student.name,
      rollNumber: student.rollNumber,
      totalMarksObtained,
      totalMaxMarks,
      averagePercentage,
      gpa: finalGradeInfo.point,
      grade: finalGradeInfo.grade,
      subjectResults,
      isFailed,
    };
  }

  private getGradeFromPercentage(percentage: number, rules: any[]) {
    const rule = rules.find(
      (r) => percentage >= r.minMarks && percentage <= r.maxMarks,
    );
    return rule || { grade: 'F', point: 0 };
  }
}
