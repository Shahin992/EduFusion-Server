import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Student } from '../../schemas/student.schema';
import { Teacher } from '../../schemas/teacher.schema';
import { Fee } from '../../schemas/fee.schema';
import { AcademicClass } from '../../schemas/academic-class.schema';
import { Exam } from '../../schemas/exam.schema';
import { Mark } from '../../schemas/mark.schema';

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectModel(Student.name) private studentModel: Model<Student>,
    @InjectModel(Teacher.name) private teacherModel: Model<Teacher>,
    @InjectModel(Fee.name) private feeModel: Model<Fee>,
    @InjectModel(AcademicClass.name) private classModel: Model<AcademicClass>,
    @InjectModel(Exam.name) private examModel: Model<Exam>,
    @InjectModel(Mark.name) private markModel: Model<Mark>,
  ) {}

  async getDashboardData(user: any) {
    if (user.role === 'student') {
      return this.getStudentDashboard(user);
    }
    return this.getAdminDashboard(user.instituteId);
  }

  private async getAdminDashboard(instituteId: string) {
    const instId = new Types.ObjectId(instituteId);
    
    const [totalStudents, totalTeachers, totalClasses, revenueStats] = await Promise.all([
      this.studentModel.countDocuments({ instituteId: instId, status: 'Active' }),
      this.teacherModel.countDocuments({ instituteId: instId }),
      this.classModel.countDocuments({ instituteId: instId }),
      this.feeModel.aggregate([
        { $match: { instituteId: instId, status: 'Paid' } },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: '$amount' },
            monthlyRevenue: {
              $sum: {
                $cond: [
                  { $gte: ['$paymentDate', new Date(new Date().getFullYear(), new Date().getMonth(), 1)] },
                  '$amount',
                  0
                ]
              }
            }
          }
        }
      ])
    ]);

    // Last 6 months revenue for chart
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);

    const revenueChart = await this.feeModel.aggregate([
      {
        $match: {
          instituteId: instId,
          status: 'Paid',
          paymentDate: { $gte: sixMonthsAgo }
        }
      },
      {
        $group: {
          _id: {
            month: { $month: '$paymentDate' },
            year: { $year: '$paymentDate' }
          },
          total: { $sum: '$amount' }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    // Format chart data
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const formattedChart = revenueChart.map(item => ({
      name: monthNames[item._id.month - 1],
      revenue: item.total
    }));

    return {
      summary: {
        totalStudents,
        totalTeachers,
        totalClasses,
        totalRevenue: revenueStats[0]?.totalRevenue || 0,
        monthlyRevenue: revenueStats[0]?.monthlyRevenue || 0,
        growthRate: '+12%'
      },
      revenueChart: formattedChart,
      recentActivity: [] // Could add latest enrollments here
    };
  }

  private async getStudentDashboard(user: any) {
    const studentId = new Types.ObjectId(user.studentId);
    const instituteId = new Types.ObjectId(user.instituteId);

    const student = await this.studentModel.findById(studentId).populate('classId');
    if (!student) return null;

    const [marks, fees, exams] = await Promise.all([
      this.markModel.find({ studentId, instituteId }).sort({ createdAt: -1 }).limit(5).populate('subjectId'),
      this.feeModel.aggregate([
        { $match: { studentId, instituteId, status: 'Paid' } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]),
      this.examModel.find({ classId: student.classId, instituteId, date: { $gte: new Date() } }).limit(3)
    ]);

    // Calculate GPA and Grades from marks
    let totalPoints = 0;
    const recentResults = marks.map(m => {
      const percentage = (m.marksObtained / 100) * 100; // Assuming 100 for simplicity or fetch subject max
      let grade = 'F';
      let point = 0;

      if (percentage >= 80) { grade = 'A+'; point = 5; }
      else if (percentage >= 70) { grade = 'A'; point = 4; }
      else if (percentage >= 60) { grade = 'A-'; point = 3.5; }
      else if (percentage >= 50) { grade = 'B'; point = 3; }
      else if (percentage >= 40) { grade = 'C'; point = 2; }
      else if (percentage >= 33) { grade = 'D'; point = 1; }

      totalPoints += point;
      
      return {
        subject: (m.subjectId as any).name,
        marks: m.marksObtained,
        grade
      };
    });

    const lastResultGPA = marks.length > 0 ? totalPoints / marks.length : 0;

    return {
      summary: {
        lastResultGPA,
        totalFeesPaid: fees[0]?.total || 0,
        pendingFees: 0 
      },
      upcomingExams: exams.map(e => ({
        name: e.name,
        date: e.startDate,
        status: e.resultPublished ? 'Published' : 'Upcoming'
      })),
      recentResults
    };
  }
}
