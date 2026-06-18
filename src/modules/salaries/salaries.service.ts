import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Salary } from '../../schemas/salary.schema';
import { Teacher } from '../../schemas/teacher.schema';

@Injectable()
export class SalariesService {
  constructor(
    @InjectModel(Salary.name) private salaryModel: Model<Salary>,
    @InjectModel(Teacher.name) private teacherModel: Model<Teacher>,
  ) {}

  async disburseSalary(data: any, instituteId: string) {
    const teacher = await this.teacherModel.findOne({ 
      _id: new Types.ObjectId(data.teacherId), 
      instituteId: new Types.ObjectId(instituteId) 
    });
    
    if (!teacher) throw new NotFoundException('Teacher not found');

    const baseSalary = Number(teacher.monthlySalary) || 0;
    const paymentAmount = Number(data.amountPaid) || 0;
    const allowances = Array.isArray(data.allowances) ? data.allowances : [];
    const deductions = Array.isArray(data.deductions) ? data.deductions : [];
    
    const totalAllowances = allowances.reduce((sum, a) => sum + (Number(a.amount) || 0), 0);
    const totalDeductions = deductions.reduce((sum, d) => sum + (Number(d.amount) || 0), 0);
    
    const netSalary = baseSalary + totalAllowances - totalDeductions;

    let salary = await this.salaryModel.findOne({
      teacherId: new Types.ObjectId(data.teacherId),
      month: data.month,
      instituteId: new Types.ObjectId(instituteId)
    });

    if (salary) {
      if (salary.status === 'Paid') {
        throw new Error('Salary already fully paid for this month');
      }
      
      // If adding additional allowances/deductions to an existing partial payment, 
      // we'd need to recalculate netSalary here. For now, assume they append to existing arrays
      if (allowances.length > 0) salary.allowances = [...salary.allowances, ...allowances];
      if (deductions.length > 0) salary.deductions = [...salary.deductions, ...deductions];
      
      const newTotalAllowances = salary.allowances.reduce((sum, a) => sum + (Number(a.amount) || 0), 0);
      const newTotalDeductions = salary.deductions.reduce((sum, d) => sum + (Number(d.amount) || 0), 0);
      const currentNetSalary = salary.baseSalary + newTotalAllowances - newTotalDeductions;
      
      salary.amountPaid += paymentAmount;
      salary.dueAmount = Math.max(0, currentNetSalary - salary.amountPaid);
      salary.status = salary.dueAmount <= 0 ? 'Paid' : 'Partial';
      
      return salary.save();
    }

    const dueAmount = Math.max(0, netSalary - paymentAmount);
    const status = dueAmount <= 0 ? 'Paid' : 'Partial';

    const newSalary = new this.salaryModel({
      ...data,
      teacherId: new Types.ObjectId(data.teacherId),
      instituteId: new Types.ObjectId(instituteId),
      baseSalary: baseSalary,
      amountPaid: paymentAmount,
      allowances,
      deductions,
      dueAmount: dueAmount,
      status: status
    });

    return newSalary.save();
  }

  async disburseBulkSalaries(data: { teacherIds: string[], month: string }, instituteId: string) {
    const results = [];
    const errors = [];
    
    for (const teacherId of data.teacherIds) {
      try {
        const teacher = await this.teacherModel.findOne({ 
          _id: new Types.ObjectId(teacherId), 
          instituteId: new Types.ObjectId(instituteId) 
        });
        
        if (!teacher) {
          errors.push({ teacherId, error: 'Teacher not found' });
          continue;
        }

        const baseSalary = Number(teacher.monthlySalary) || 0;
        let salary = await this.salaryModel.findOne({
          teacherId: new Types.ObjectId(teacherId),
          month: data.month,
          instituteId: new Types.ObjectId(instituteId)
        });

        if (salary) {
          if (salary.status === 'Paid') continue;
          
          salary.amountPaid += salary.dueAmount;
          salary.dueAmount = 0;
          salary.status = 'Paid';
          await salary.save();
          results.push(salary);
        } else {
          const newSalary = new this.salaryModel({
            teacherId: new Types.ObjectId(teacherId),
            instituteId: new Types.ObjectId(instituteId),
            month: data.month,
            baseSalary: baseSalary,
            amountPaid: baseSalary,
            dueAmount: 0,
            status: 'Paid',
            paymentDate: new Date()
          });
          await newSalary.save();
          results.push(newSalary);
        }
      } catch (err) {
        errors.push({ teacherId, error: err.message });
      }
    }
    
    return {
      message: `Successfully processed ${results.length} salary payments.`,
      successCount: results.length,
      errors
    };
  }

  async getSalaryHistory(instituteId: string, query: any) {
    const { page = 1, limit = 10, month } = query;
    const filter: any = { instituteId: new Types.ObjectId(instituteId) };
    
    if (month) {
      filter.month = month;
    }

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
