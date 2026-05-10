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
    const { page = 1, limit = 10, search } = query;
    const filter: any = { instituteId: new Types.ObjectId(instituteId) };

    if (search) {
      // In a real app, we'd join with students to search by name
      // For now, simple ID or receipt search
      filter.$or = [
        { receiptNumber: new RegExp(search, 'i') },
      ];
    }

    const fees = await this.feeModel.find(filter)
      .populate('studentId', 'name rollNumber')
      .sort({ paymentDate: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

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
