import { Controller, Get, Post, Body, Query, UseGuards, Request, Param } from '@nestjs/common';
import { FeesService } from './fees.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CreateFeeDto } from './dto/create-fee.dto';

@ApiTags('Fees')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('fees')
export class FeesController {
  constructor(private readonly feesService: FeesService) {}

  @Post()
  @ApiOperation({ summary: 'Record a new student fee payment' })
  async recordPayment(@Body() data: CreateFeeDto, @Request() req) {
    return this.feesService.recordPayment(data, req.user.instituteId);
  }

  @Get('student/me')
  async getStudentPayments(@Request() req) {
    if (req.user.role !== 'student') {
      throw new Error('Unauthorized');
    }
    return this.feesService.findStudentPayments(req.user.studentId, req.user.instituteId);
  }

  @Get()
  @ApiOperation({ summary: 'Get all fee payments' })
  async getAllFees(@Query() query: any, @Request() req) {
    return this.feesService.getAllFees(req.user.instituteId, query);
  }

  @Get('dues/:classId')
  @ApiOperation({ summary: 'Get students with dues for a class' })
  async getDues(@Param('classId') classId: string, @Request() req) {
    return this.feesService.getDues(classId, req.user.instituteId);
  }
}
