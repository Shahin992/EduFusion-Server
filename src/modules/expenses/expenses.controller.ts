import { Controller, Get, Post, Body, Query, UseGuards, Request } from '@nestjs/common';
import { ExpensesService } from './expenses.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CreateExpenseDto } from './dto/create-expense.dto';

@ApiTags('Expenses')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('expenses')
export class ExpensesController {
  constructor(private readonly expensesService: ExpensesService) {}

  @Post()
  @ApiOperation({ summary: 'Add a new expense' })
  async createExpense(@Body() data: CreateExpenseDto, @Request() req) {
    return this.expensesService.createExpense(data, req.user.instituteId);
  }

  @Get()
  @ApiOperation({ summary: 'Get all expenses with pagination' })
  async getExpenses(@Query() query: any, @Request() req) {
    return this.expensesService.getExpenses(req.user.instituteId, query);
  }
}
