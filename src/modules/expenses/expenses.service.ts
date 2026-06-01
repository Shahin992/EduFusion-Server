import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Expense } from '../../schemas/expense.schema';
import { CreateExpenseDto } from './dto/create-expense.dto';

@Injectable()
export class ExpensesService {
  constructor(
    @InjectModel(Expense.name) private expenseModel: Model<Expense>
  ) {}

  async createExpense(data: CreateExpenseDto, instituteId: string) {
    const expense = new this.expenseModel({
      ...data,
      instituteId
    });

    await expense.save();

    return {
      success: true,
      message: 'Expense added successfully',
      data: expense
    };
  }

  async getExpenses(instituteId: string, query: any) {
    const { page = 1, limit = 10, search = '' } = query;
    const skip = (Number(page) - 1) * Number(limit);

    const filter: any = { instituteId };

    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { category: { $regex: search, $options: 'i' } }
      ];
    }

    const expenses = await this.expenseModel
      .find(filter)
      .sort({ date: -1 })
      .skip(skip)
      .limit(Number(limit));

    const total = await this.expenseModel.countDocuments(filter);

    return {
      expenses,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit))
      }
    };
  }
}
