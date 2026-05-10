import { Controller, Get, Post, Body, Query, UseGuards, Request } from '@nestjs/common';
import { SalariesService } from './salaries.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Salaries')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('salaries')
export class SalariesController {
  constructor(private readonly salariesService: SalariesService) {}

  @Post()
  @ApiOperation({ summary: 'Disburse a teacher salary' })
  async disburseSalary(@Body() data: any, @Request() req) {
    return this.salariesService.disburseSalary(data, req.user.instituteId);
  }

  @Get()
  @ApiOperation({ summary: 'Get salary payment history' })
  async getSalaryHistory(@Query() query: any, @Request() req) {
    return this.salariesService.getSalaryHistory(req.user.instituteId, query);
  }
}
