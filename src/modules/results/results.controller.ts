import { Controller, Get, Param, UseGuards, Request, Query } from '@nestjs/common';
import { ResultsService } from './results.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Results')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('results')
export class ResultsController {
  constructor(private readonly resultsService: ResultsService) {}

  @Get('exam/:examId/class/:classId')
  @ApiOperation({ summary: 'Get class results for an exam' })
  async getClassResults(
    @Param('examId') examId: string,
    @Param('classId') classId: string,
    @Request() req,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
  ) {
    if (!['admin', 'superadmin', 'teacher'].includes(req.user.role)) {
      throw new Error('Unauthorized');
    }
    return this.resultsService.getClassResults(
      examId,
      classId,
      req.user.instituteId,
      page ? parseInt(page) : undefined,
      limit ? parseInt(limit) : undefined,
      search
    );
  }

  @Get('me/exam/:examId')
  @ApiOperation({ summary: 'Get my result for an exam' })
  async getMyResult(@Param('examId') examId: string, @Request() req) {
    if (req.user.role !== 'student') {
      throw new Error('Unauthorized');
    }
    return this.resultsService.getStudentResult(req.user.studentId, examId, req.user.instituteId, false);
  }
  @Get('student/:studentId/exam/:examId')
  @ApiOperation({ summary: 'Get individual student result' })
  async getStudentResult(
    @Param('studentId') studentId: string,
    @Param('examId') examId: string,
    @Request() req,
  ) {
    const isStaff = ['admin', 'superadmin', 'teacher'].includes(req.user.role);
    return this.resultsService.getStudentResult(studentId, examId, req.user.instituteId, isStaff);
  }
}
