import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Student } from '../../schemas/student.schema';
import { Teacher } from '../../schemas/teacher.schema';
import { Fee } from '../../schemas/fee.schema';
import { AcademicClass } from '../../schemas/academic-class.schema';
import { Exam } from '../../schemas/exam.schema';
import { Mark } from '../../schemas/mark.schema';
import { Institute } from '../../schemas/institute.schema';
import { Lead } from '../../schemas/lead.schema';
import { Salary } from '../../schemas/salary.schema';

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectModel(Student.name) private studentModel: Model<Student>,
    @InjectModel(Teacher.name) private teacherModel: Model<Teacher>,
    @InjectModel(Fee.name) private feeModel: Model<Fee>,
    @InjectModel(AcademicClass.name) private classModel: Model<AcademicClass>,
    @InjectModel(Exam.name) private examModel: Model<Exam>,
    @InjectModel(Mark.name) private markModel: Model<Mark>,
    @InjectModel(Institute.name) private instituteModel: Model<Institute>,
    @InjectModel(Lead.name) private leadModel: Model<Lead>,
    @InjectModel(Salary.name) private salaryModel: Model<Salary>,
  ) {}

  async getDashboardData(user: any, timeframe?: string) {
    if (user.role === 'super_admin') {
      return this.getSuperAdminDashboard(timeframe);
    } else if (user.role === 'student') {
      return this.getStudentDashboard(user, timeframe);
    }
    return this.getAdminDashboard(user.instituteId, timeframe);
  }

  private async getAdminDashboard(instituteId: string, timeframe?: string) {
    const instId = new Types.ObjectId(instituteId);
    
    const now = new Date();
    let targetMonth = now.toLocaleString('default', { month: 'long', year: 'numeric' });
    let monthMatch: any = { month: targetMonth };
    let dateFilter: any = {};

    if (timeframe === 'previous_month') {
      const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      targetMonth = prev.toLocaleString('default', { month: 'long', year: 'numeric' });
      monthMatch = { month: targetMonth };
      
      const startOfPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const endOfPrevMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
      dateFilter = { createdAt: { $gte: startOfPrevMonth, $lte: endOfPrevMonth } };
    } else if (timeframe === 'current_year') {
      const yearStr = now.getFullYear().toString();
      monthMatch = { month: { $regex: yearStr, $options: 'i' } };
      dateFilter = { createdAt: { $gte: new Date(now.getFullYear(), 0, 1) } };
    } else if (timeframe === 'all_time') {
      monthMatch = {};
      dateFilter = {};
    }

    // KPIs
    const [totalStudents, totalTeachers, totalExams, fees] = await Promise.all([
      this.studentModel.countDocuments({ instituteId: instId, status: 'Active', ...dateFilter }),
      this.teacherModel.countDocuments({ instituteId: instId, status: 'Active', ...dateFilter }),
      this.examModel.countDocuments({ instituteId: instId, ...dateFilter }),
      this.feeModel.aggregate([
        { $match: { instituteId: instId, status: 'Paid', ...monthMatch } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ])
    ]);

    // Fee Chart Logic (Paid vs Due for current month)
    const paidStudentsCount = await this.feeModel.distinct('studentId', {
      instituteId: instId,
      feeType: 'Monthly',
      status: 'Paid',
      ...monthMatch
    }).then(res => res.length);
    const dueStudentsCount = Math.max(0, totalStudents - paidStudentsCount);

    // Payroll Chart Logic
    const salaries = await this.salaryModel.aggregate([
      { $match: { instituteId: instId, ...monthMatch } },
      { $group: { 
          _id: '$status', 
          total: { $sum: '$amount' } 
        } 
      }
    ]);
    const paidSalaries = salaries.find(s => s._id === 'Paid')?.total || 0;
    const unpaidSalaries = salaries.find(s => s._id === 'Pending' || s._id === 'Unpaid')?.total || 0;

    // Recent Lists
    const [recentStudents, rawRecentResults, rawUpcomingExams] = await Promise.all([
      this.studentModel.find({ instituteId: instId, ...dateFilter }).sort({ createdAt: -1 }).limit(5).populate('classId', 'name'),
      this.examModel.find({ instituteId: instId, resultPublished: true, ...dateFilter }).sort({ updatedAt: -1 }).limit(5).populate('classId', 'name'),
      this.examModel.find({ instituteId: instId, resultPublished: false, startDate: { $gte: new Date() } }).sort({ startDate: 1 }).limit(5).populate('classId', 'name')
    ]);

    return {
      kpis: {
        totalStudents,
        totalTeachers,
        totalExams,
        feeCollection: fees[0]?.total || 0,
      },
      charts: {
        feeStatus: {
          paid: paidStudentsCount,
          due: dueStudentsCount
        },
        payroll: {
          paid: paidSalaries,
          unpaid: unpaidSalaries
        }
      },
      lists: {
        recentStudents: recentStudents.map((s: any) => ({
          name: s.name,
          className: (s.classId as any)?.name || 'N/A',
          createdAt: s.createdAt
        })),
        recentResults: rawRecentResults.map((e: any) => ({
          examName: e.name,
          className: (e.classId as any)?.name || 'N/A',
          createdAt: e.updatedAt || e.createdAt
        })),
        upcomingExams: rawUpcomingExams.map((e: any) => ({
          examName: e.name,
          className: (e.classId as any)?.name || 'N/A',
          date: e.startDate
        }))
      }
    };
  }

  private async getStudentDashboard(user: any, timeframe?: string) {
    const studentId = new Types.ObjectId(user.studentId);
    const instituteId = new Types.ObjectId(user.instituteId);
    
    const now = new Date();
    let targetMonth = now.toLocaleString('default', { month: 'long', year: 'numeric' });
    let monthMatch: any = { month: targetMonth };
    let dateFilter: any = {};

    if (timeframe === 'previous_month') {
      const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      targetMonth = prev.toLocaleString('default', { month: 'long', year: 'numeric' });
      monthMatch = { month: targetMonth };
      
      const startOfPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const endOfPrevMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
      dateFilter = { createdAt: { $gte: startOfPrevMonth, $lte: endOfPrevMonth } };
    } else if (timeframe === 'current_year') {
      const yearStr = now.getFullYear().toString();
      monthMatch = { month: { $regex: yearStr, $options: 'i' } };
      dateFilter = { createdAt: { $gte: new Date(now.getFullYear(), 0, 1) } };
    } else if (timeframe === 'all_time') {
      monthMatch = {};
      dateFilter = {};
    }

    const student = await this.studentModel.findById(studentId);
    if (!student) return null;

    const [currentMonthFee, latestPayment, exams, marks] = await Promise.all([
      this.feeModel.findOne({ studentId, feeType: 'Monthly', status: 'Paid', ...monthMatch }),
      this.feeModel.findOne({ studentId, status: 'Paid', ...monthMatch }).sort({ paymentDate: -1 }),
      this.examModel.find({ classId: student.classId, instituteId, startDate: { $gte: new Date() } }).limit(5),
      this.markModel.find({ studentId, instituteId, ...dateFilter }).sort({ createdAt: -1 }).limit(10).populate('subjectId examId')
    ]);

    // Group marks by exam for the chart
    const examMap = new Map();
    marks.forEach(m => {
      const eName = (m.examId as any)?.name;
      if (!eName) return;
      if (!examMap.has(eName)) {
        examMap.set(eName, { examName: eName, totalPoints: 0, count: 0 });
      }
      const mapItem = examMap.get(eName);
      
      const percentage = (m.marksObtained / 100) * 100;
      let point = 0;
      if (percentage >= 80) point = 5;
      else if (percentage >= 70) point = 4;
      else if (percentage >= 60) point = 3.5;
      else if (percentage >= 50) point = 3;
      else if (percentage >= 40) point = 2;
      else if (percentage >= 33) point = 1;

      mapItem.totalPoints += point;
      mapItem.count += 1;
    });

    const performance = Array.from(examMap.values()).map(e => ({
      examName: e.examName,
      gpa: Number((e.totalPoints / e.count).toFixed(2))
    })).reverse(); // Oldest to newest for trend

    // Recent results list
    const recentResults = marks.slice(0, 5).map(m => {
      const percentage = (m.marksObtained / 100) * 100;
      let point = 0;
      if (percentage >= 80) point = 5;
      else if (percentage >= 70) point = 4;
      else if (percentage >= 60) point = 3.5;
      else if (percentage >= 50) point = 3;
      else if (percentage >= 40) point = 2;
      else if (percentage >= 33) point = 1;

      return {
        subjectName: (m.subjectId as any)?.name || 'Unknown',
        examName: (m.examId as any)?.name || 'Unknown',
        gpa: point
      };
    });

    // Recent Payments
    const recentPayments = await this.feeModel.find({ studentId, status: 'Paid' }).sort({ paymentDate: -1 }).limit(5);

    return {
      kpis: {
        currentMonthFeeStatus: currentMonthFee ? 'Paid' : 'Due',
        latestPaymentAmount: latestPayment?.amount || 0,
        upcomingExams: exams.length,
        totalResults: examMap.size
      },
      charts: {
        performance
      },
      lists: {
        recentResults,
        recentPayments: recentPayments.map(p => ({
          feeType: p.feeType,
          amount: p.amount,
          paymentDate: p.paymentDate
        }))
      }
    };
  }

  private async getSuperAdminDashboard(timeframe?: string) {
    const now = new Date();
    let dateFilter: any = {};

    if (timeframe === 'previous_month') {
      const startOfPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const endOfPrevMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
      dateFilter = { createdAt: { $gte: startOfPrevMonth, $lte: endOfPrevMonth } };
    } else if (timeframe === 'current_year') {
      dateFilter = { createdAt: { $gte: new Date(now.getFullYear(), 0, 1) } };
    } else if (timeframe === 'all_time') {
      dateFilter = {};
    }

    const [totalInstitutes, activeSubscriptions, totalLeads, revenueAggregate] = await Promise.all([
      this.instituteModel.countDocuments(dateFilter),
      this.instituteModel.countDocuments({ status: 'Active', ...dateFilter }),
      this.leadModel.countDocuments(dateFilter),
      this.instituteModel.aggregate([
        // Platform payments logic goes here if implemented later
      ])
    ]);

    // Institute Onboarding Trend (Last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);

    const trendRaw = await this.instituteModel.aggregate([
      { $match: { createdAt: { $gte: sixMonthsAgo } } },
      { $group: { _id: { month: { $month: '$createdAt' }, year: { $year: '$createdAt' } }, count: { $sum: 1 } } },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const onboardingTrend = trendRaw.map(item => ({
      month: monthNames[item._id.month - 1],
      institutes: item.count
    }));

    // Subscription Plans (Pie Chart)
    // If institute doesn't have plan field, we just mock based on status for now
    const plansRaw = await this.instituteModel.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);
    const subscriptionPlans = plansRaw.map(p => ({
      name: p._id || 'Unknown',
      value: p.count,
      color: p._id === 'Active' ? '#10b981' : '#f59e0b'
    }));

    // Lists
    const [recentInstitutes, recentLeads] = await Promise.all([
      this.instituteModel.find().sort({ createdAt: -1 }).limit(5),
      this.leadModel.find().sort({ createdAt: -1 }).limit(5)
    ]);

    return {
      kpis: {
        totalInstitutes,
        activeSubscriptions,
        totalLeads,
        totalPlatformRevenue: 0 // Will implement real payment tracking later
      },
      charts: {
        onboardingTrend,
        subscriptionPlans
      },
      lists: {
        recentInstitutes: recentInstitutes.map((i: any) => ({
          name: i.name,
          status: i.status,
          createdAt: i.createdAt
        })),
        recentLeads: recentLeads.map((l: any) => ({
          name: l.name,
          instituteName: l.instituteName,
          createdAt: l.createdAt
        }))
      }
    };
  }
}
