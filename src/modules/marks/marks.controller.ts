import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  Delete,
} from '@nestjs/common';
import { MarksService } from './marks.service';
import { BulkUpsertMarksDto, StudentWiseUpsertMarksDto } from './dto/bulk-upsert-marks.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Marks')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('marks')
export class MarksController {
  constructor(private readonly marksService: MarksService) {}

  @Post('bulk-upsert')
  @ApiOperation({ summary: 'Save/Update marks for multiple students' })
  async bulkUpsert(@Body() bulkDto: BulkUpsertMarksDto, @Request() req) {
    const data = await this.marksService.bulkUpsert(bulkDto, req.user.instituteId);
    return { data, message: 'Marks updated successfully' };
  }

  @Post('student-wise-upsert')
  @ApiOperation({ summary: 'Save/Update marks for a single student across multiple subjects' })
  async studentWiseUpsert(@Body() bulkDto: StudentWiseUpsertMarksDto, @Request() req) {
    const data = await this.marksService.studentWiseUpsert(bulkDto, req.user.instituteId);
    return { data, message: 'Student marks updated successfully' };
  }

  @Get('filter')
  @ApiOperation({ summary: 'Get marks by exam, class, and subject' })
  async findByFilter(
    @Request() req,
    @Query('examId') examId: string,
    @Query('classId') classId?: string,
    @Query('subjectId') subjectId?: string,
  ) {
    return this.marksService.findByExamAndClass(
      examId,
      classId,
      subjectId,
      req.user.instituteId,
    );
  }

  @Get('report-card/:studentId')
  @ApiOperation({ summary: 'Generate temporary report card for a student' })
  async getStudentReport(
    @Param('studentId') studentId: string,
    @Query('examId') examId: string,
    @Request() req,
  ) {
    return this.marksService.getStudentReport(
      studentId,
      examId,
      req.user.instituteId,
    );
  }

  @Delete('student/:studentId/exam/:examId')
  @ApiOperation({ summary: 'Clear all marks for a student in a specific exam' })
  async clearStudentMarks(
    @Param('studentId') studentId: string,
    @Param('examId') examId: string,
    @Request() req,
  ) {
    const result = await this.marksService.clearStudentMarks(
      studentId,
      examId,
      req.user.instituteId,
    );
    return { data: result, message: 'Student marks cleared successfully' };
  }
}
