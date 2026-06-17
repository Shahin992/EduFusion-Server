import { Controller, Get, Post, Body, Query, UseGuards, Request, Param } from '@nestjs/common';
import { FeesService } from './fees.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CreateFeeDto } from './dto/create-fee.dto';
import { GenerateBulkFeesDto } from './dto/generate-bulk-fees.dto';

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

  @Get('students/summary')
  @ApiOperation({ summary: 'Get student fee summaries' })
  async getStudentsFeeSummary(@Query() query: any, @Request() req) {
    return this.feesService.getStudentsFeeSummary(req.user.instituteId, query);
  }

  @Get('dues/:classId')
  @ApiOperation({ summary: 'Get students with dues for a class' })
  async getDues(
    @Param('classId') classId: string, 
    @Query() query: any, 
    @Request() req
  ) {
    return this.feesService.getBulkDues(classId, query, req.user.instituteId);
  }

  @Post('bulk')
  @ApiOperation({ summary: 'Record bulk fee payments' })
  async recordBulkPayments(@Body() data: any, @Request() req) {
    return this.feesService.recordBulkPayments(data, req.user.instituteId);
  }

  @Get('student/:studentId/dues')
  @ApiOperation({ summary: 'Get all pending dues for a student' })
  async getStudentDues(@Param('studentId') studentId: string, @Request() req) {
    return this.feesService.getStudentDues(studentId, req.user.instituteId);
  }

  @Get('student/:studentId/all')
  @ApiOperation({ summary: 'Get all fees (due and paid) for a student' })
  async getAllStudentFees(@Param('studentId') studentId: string, @Query() query: any, @Request() req) {
    return this.feesService.getAllStudentFees(studentId, req.user.instituteId, query);
  }

  @Post('student/bulk-pay')
  @ApiOperation({ summary: 'Pay multiple dues for a student' })
  async payStudentDues(@Body() data: any, @Request() req) {
    return this.feesService.payStudentDues(data, req.user.instituteId);
  }

  @Post('generate-bulk')
  @ApiOperation({ summary: 'Generate bulk pending fees via BullMQ' })
  async generateBulkFees(@Body() data: GenerateBulkFeesDto, @Request() req) {
    return this.feesService.scheduleBulkFeeGeneration(data, req.user.instituteId);
  }
}
