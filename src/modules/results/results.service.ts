import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
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

  async getClassResults(examId: string, classId: string, instituteId: string) {
    const institute = await this.instituteModel.findById(instituteId);
    if (!institute) throw new NotFoundException('Institute not found');

    const exam = await this.examModel.findOne({ _id: examId, instituteId });
    if (!exam) throw new NotFoundException('Exam not found');

    // Fetch all marks for this exam and class
    const marks = await this.markModel.find({
      examId,
      classId,
      instituteId,
    }).populate('studentId subjectId');

    // Fetch all students in this class to ensure we include those without marks
    const students = await this.studentModel.find({
      classId,
      instituteId,
      isActive: true,
    }).sort({ rollNumber: 1 });

    const gradingRules = institute.gradingRules || [];

    const results = students.map((student) => {
      const studentMarks = marks.filter(
        (m) => (m.studentId as any)._id.toString() === student._id.toString(),
      );

      return this.calculateStudentResult(student, studentMarks, gradingRules, exam);
    });

    // Rank students by GPA, then total marks
    return results.sort((a, b) => {
      if (b.gpa !== a.gpa) return b.gpa - a.gpa;
      return b.totalMarksObtained - a.totalMarksObtained;
    });
  }

  async getStudentResult(studentId: string, examId: string, instituteId: string) {
    const institute = await this.instituteModel.findById(instituteId);
    const exam = await this.examModel.findOne({ _id: examId, instituteId });
    const student = await this.studentModel.findOne({ _id: studentId, instituteId });

    if (!student || !exam) throw new NotFoundException('Student or Exam not found');

    const studentMarks = await this.markModel.find({
      studentId,
      examId,
      instituteId,
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
