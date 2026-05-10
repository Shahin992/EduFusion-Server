import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Salary } from '../../schemas/salary.schema';
import { Teacher } from '../../schemas/teacher.schema';

@Injectable()
export class SalariesService {
  constructor(
    @InjectModel(Salary.name) private salaryModel: Model<Salary>,
    @InjectModel(Teacher.name) private teacherModel: Model<Teacher>,
  ) {}

  async disburseSalary(data: any, instituteId: string) {
    const teacher = await this.teacherModel.findOne({ _id: data.teacherId, instituteId });
    if (!teacher) throw new NotFoundException('Teacher not found');

    const newSalary = new this.salaryModel({
      ...data,
      instituteId,
      baseSalary: Number(teacher.monthlySalary) || 0,
    });

    return newSalary.save();
  }

  async getSalaryHistory(instituteId: string, query: any) {
    const { page = 1, limit = 10 } = query;
    const filter = { instituteId };

    const salaries = await this.salaryModel.find(filter)
      .populate('teacherId', 'name designation')
      .sort({ paymentDate: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const total = await this.salaryModel.countDocuments(filter);

    return {
      salaries,
      total,
      pages: Math.ceil(total / limit),
    };
  }
}
