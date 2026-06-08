import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Fee } from '../../schemas/fee.schema';
import { Student } from '../../schemas/student.schema';
import { AcademicClass } from '../../schemas/academic-class.schema';
import { GenerateBulkFeesDto } from './dto/generate-bulk-fees.dto';

@Injectable()
export class FeesService {
  private readonly logger = new Logger(FeesService.name);

  constructor(
    @InjectQueue('fees') private feesQueue: Queue,
    @InjectModel(Fee.name) private feeModel: Model<Fee>,
    @InjectModel(Student.name) private studentModel: Model<Student>,
    @InjectModel(AcademicClass.name) private academicClassModel: Model<AcademicClass>,
  ) {}

  @Cron(CronExpression.EVERY_1ST_DAY_OF_MONTH_AT_MIDNIGHT)
  async generateMonthlyFeesJob() {
    this.logger.log('Cron Job Triggered: Scheduling generate-monthly-fees via BullMQ...');
    const currentMonth = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });
    
    try {
      await this.feesQueue.add('generate-monthly-fees', { currentMonth }, {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
      });
      this.logger.log(`Job added to queue for month: ${currentMonth}`);
    } catch (error) {
      this.logger.error('Failed to add job to queue', error);
    }
  }

  async recordPayment(data: any, instituteId: string) {
    const student = await this.studentModel.findOne({ 
      _id: new Types.ObjectId(data.studentId), 
      instituteId: new Types.ObjectId(instituteId) 
    });
    if (!student) {
      throw new NotFoundException('Student not found');
    }

    let totalAmount = data.totalAmount;
    if (totalAmount === undefined) {
      if (student.monthlyFees !== undefined && student.monthlyFees !== null) {
        totalAmount = student.monthlyFees;
      } else {
        const cls = await this.academicClassModel.findById(student.classId);
        totalAmount = cls ? cls.monthlyFee : 0;
      }
    }

    const amount = Number(data.amount) || 0;
    const dueAmount = data.dueAmount !== undefined ? Number(data.dueAmount) : (totalAmount - amount);
    const status = dueAmount <= 0 ? 'Paid' : (amount > 0 ? 'Partial' : 'Pending');

    const receiptNumber = `EF-${new Date().getFullYear()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

    // If an existing pending/partial fee for the same month and type exists, we could update it.
    // For now, if we are passing an ID (from edit), update it.
    if (data._id) {
      const existingFee = await this.feeModel.findById(data._id);
      if (existingFee) {
        existingFee.amount = (existingFee.amount || 0) + amount;
        existingFee.dueAmount = Math.max(0, existingFee.totalAmount - existingFee.amount);
        existingFee.status = existingFee.dueAmount <= 0 ? 'Paid' : 'Partial';
        existingFee.paymentDate = data.paymentDate || existingFee.paymentDate;
        existingFee.note = data.note || existingFee.note;
        return await existingFee.save();
      }
    }

    const newFee = new this.feeModel({
      ...data,
      totalAmount,
      amount,
      dueAmount,
      status,
      instituteId,
      receiptNumber,
    });

    return await newFee.save();
  }

  async findStudentPayments(studentId: string, instituteId: string) {
    return this.feeModel.find({
      studentId: new Types.ObjectId(studentId),
      instituteId: new Types.ObjectId(instituteId),
      status: 'Paid'
    }).sort({ paymentDate: -1 }).exec();
  }

  async getAllFees(instituteId: string, query: any) {
    const { page = 1, limit = 10, search, classId, status } = query;
    const filter: any = { instituteId: new Types.ObjectId(instituteId) };

    if (status) {
      filter.status = status;
    }

    let studentIds = [];
    let hasStudentFilter = false;

    if (search || classId) {
      const studentFilter: any = { instituteId: new Types.ObjectId(instituteId) };
      
      if (search) {
        studentFilter.$or = [
          { name: new RegExp(search, 'i') },
          { rollNumber: new RegExp(search, 'i') }
        ];
      }
      
      if (classId) {
        studentFilter.classId = new Types.ObjectId(classId);
      }
      
      const students = await this.studentModel.find(studentFilter).select('_id');
      studentIds = students.map(s => s._id);
      hasStudentFilter = true;
    }

    if (hasStudentFilter) {
      if (studentIds.length === 0 && !search) {
        return { fees: [], total: 0, pages: 0 };
      }
      
      filter.$or = [];
      if (studentIds.length > 0) {
        filter.$or.push({ studentId: { $in: studentIds } });
      }
      if (search) {
        filter.$or.push({ receiptNumber: new RegExp(search, 'i') });
      }
      
      if (filter.$or.length === 0) {
          delete filter.$or;
          // force empty result if search didn't match any student and we don't have other conditions
          filter._id = null;
      }
    }

    const fees = await this.feeModel.find(filter)
      .populate({
        path: 'studentId',
        select: 'name rollNumber classId',
        populate: {
          path: 'classId',
          select: 'name'
        }
      })
      .sort({ paymentDate: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const total = await this.feeModel.countDocuments(filter);

    return {
      fees,
      total,
      pages: Math.ceil(total / limit),
    };
  }

  async getBulkDues(classId: string, query: any, instituteId: string) {
    const { page = 1, limit = 25, search, feeType = 'Monthly', month, feeName } = query;
    const filter: any = { 
      classId: new Types.ObjectId(classId), 
      instituteId: new Types.ObjectId(instituteId), 
      status: 'Active' 
    };

    if (search) {
      filter.$or = [
        { name: new RegExp(search, 'i') },
        { rollNumber: new RegExp(search, 'i') }
      ];
    }

    const students = await this.studentModel.find(filter);

    const cls = await this.academicClassModel.findById(classId);
    const baseFee = cls ? cls.monthlyFee : 0;

    const feeQuery: any = {
      instituteId: new Types.ObjectId(instituteId),
      feeType,
    };
    if (feeType === 'Monthly' && month) feeQuery.month = month;
    if (feeType === 'Other' && feeName) feeQuery.note = new RegExp(feeName, 'i');

    const fees = await this.feeModel.find(feeQuery);

    const feeMap = new Map();
    for (const fee of fees) {
      feeMap.set(fee.studentId.toString(), fee);
    }

    const dues = [];
    for (const student of students) {
      let expectedFee = feeType === 'Monthly' ? ((student.monthlyFees !== undefined && student.monthlyFees !== null) ? student.monthlyFees : baseFee) : 0;
      const existingFee = feeMap.get(student._id.toString());
      
      let dueAmount = expectedFee;
      let paidAmount = 0;
      let status = 'Pending';
      let feeId = null;

      if (existingFee) {
        expectedFee = existingFee.totalAmount;
        dueAmount = existingFee.dueAmount;
        paidAmount = existingFee.amount;
        status = existingFee.status;
        feeId = existingFee._id;
      }

      if (status !== 'Paid') {
        dues.push({
          student: {
            _id: student._id,
            name: student.name,
            rollNumber: student.rollNumber,
          },
          feeId,
          totalAmount: expectedFee,
          paidAmount,
          dueAmount,
          status
        });
      }
    }

    const total = dues.length;
    const paginatedDues = dues.slice((Number(page) - 1) * Number(limit), Number(page) * Number(limit));

    return {
      dues: paginatedDues,
      total,
      pages: Math.ceil(total / Number(limit))
    };
  }

  async recordBulkPayments(data: { classId: string, feeType?: string, month?: string, feeName?: string, payments: any[] }, instituteId: string) {
    const { feeType = 'Monthly', month, feeName, payments } = data;
    const results = [];
    
    for (const p of payments) {
      const paymentData = {
        _id: p.feeId,
        studentId: p.studentId,
        feeType,
        month: feeType === 'Monthly' ? month : undefined,
        amount: p.amountPaid,
        totalAmount: p.totalAmount,
        dueAmount: p.dueAmount,
        paymentDate: new Date(),
        note: feeType === 'Other' ? (feeName || 'Bulk Collection') : 'Bulk Collection'
      };
      
      const result = await this.recordPayment(paymentData, instituteId);
      results.push(result);
    }
    
    return results;
  }

  async getDues(classId: string, instituteId: string) {
    const currentMonth = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });
    return this.getBulkDues(classId, { month: currentMonth, feeType: 'Monthly' }, instituteId);
  }

  async getStudentDues(studentId: string, instituteId: string) {
    return this.feeModel.find({
      studentId: new Types.ObjectId(studentId),
      instituteId: new Types.ObjectId(instituteId),
      status: { $in: ['Pending', 'Partial'] }
    }).sort({ paymentDate: -1 }).exec();
  }

  async payStudentDues(data: { payments: { feeId: string, amountPaid: number }[] }, instituteId: string) {
    const results = [];
    for (const p of data.payments) {
      const existingFee = await this.feeModel.findOne({ _id: new Types.ObjectId(p.feeId), instituteId: new Types.ObjectId(instituteId) });
      if (existingFee) {
        const updateData = {
          _id: existingFee._id,
          studentId: existingFee.studentId,
          amount: p.amountPaid,
          paymentDate: new Date()
        };
        const res = await this.recordPayment(updateData, instituteId);
        results.push(res);
      }
    }
    return results;
  }

  async scheduleBulkFeeGeneration(data: GenerateBulkFeesDto, instituteId: string) {
    this.logger.log(`Scheduling custom bulk fee generation via BullMQ for institute: ${instituteId}`);
    try {
      await this.feesQueue.add('generate-custom-bulk-fees', {
        ...data,
        instituteId,
      }, {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
      });
      return { success: true, message: 'Fee generation started in the background.' };
    } catch (error) {
      this.logger.error('Failed to schedule custom bulk fee generation', error);
      throw new BadRequestException('Could not start bulk generation');
    }
  }
}
