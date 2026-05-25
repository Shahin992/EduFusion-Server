import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Fee } from '../../schemas/fee.schema';
import { Student } from '../../schemas/student.schema';

@Injectable()
export class FeesService {
  constructor(
    @InjectModel(Fee.name) private feeModel: Model<Fee>,
    @InjectModel(Student.name) private studentModel: Model<Student>,
  ) {}

  async recordPayment(data: any, instituteId: string) {
    const student = await this.studentModel.findOne({ 
      _id: new Types.ObjectId(data.studentId), 
      instituteId: new Types.ObjectId(instituteId) 
    });
    if (!student) {
      console.error(`Fee record failed: Student ${data.studentId} not found for institute ${instituteId}`);
      throw new NotFoundException('Student not found');
    }

    // Auto-generate receipt number: EF-YEAR-RANDOM
    const receiptNumber = `EF-${new Date().getFullYear()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

    const newFee = new this.feeModel({
      ...data,
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
    const { page = 1, limit = 10, search, classId } = query;
    const filter: any = { instituteId: new Types.ObjectId(instituteId) };

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

  async getDues(classId: string, instituteId: string) {
    // Logic to find students who haven't paid for the current month
    const students = await this.studentModel.find({ 
      classId: new Types.ObjectId(classId), 
      instituteId: new Types.ObjectId(instituteId), 
      isActive: true 
    });
    const currentMonth = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });

    const paidStudents = await this.feeModel.find({
      instituteId,
      feeType: 'Monthly',
      month: currentMonth,
      status: 'Paid',
    }).distinct('studentId');

    const paidIds = paidStudents.map(id => id.toString());

    return students.filter(s => !paidIds.includes(s._id.toString()));
  }
}
