import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ExamsService } from './exams.service';
import { CreateExamDto } from './dto/create-exam.dto';
import { UpdateExamDto } from './dto/update-exam.dto';
import { BulkCreateScheduleDto } from './dto/bulk-create-schedule.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Exams')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('exams')
export class ExamsController {
  constructor(private readonly examsService: ExamsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new exam' })
  async create(@Body() createExamDto: CreateExamDto, @Request() req) {
    const data = await this.examsService.create(createExamDto, req.user.instituteId);
    return { data, message: 'Exam created successfully' };
  }

  @Get()
  @ApiOperation({ summary: 'Get all exams' })
  async findAll(@Request() req, @Query('classId') classId?: string) {
    return this.examsService.findAll(req.user.instituteId, classId);
  }

  @Get('active')
  @ApiOperation({ summary: 'Get ongoing/upcoming exams' })
  async findActive(@Request() req) {
    return this.examsService.findActive(req.user.instituteId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get exam by ID' })
  async findOne(@Param('id') id: string, @Request() req) {
    return this.examsService.findOne(id, req.user.instituteId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an existing exam' })
  async update(
    @Param('id') id: string,
    @Body() updateExamDto: UpdateExamDto,
    @Request() req,
  ) {
    const data = await this.examsService.update(
      id,
      updateExamDto,
      req.user.instituteId,
    );
    return { data, message: 'Exam updated successfully' };
  }

  @Post('schedule')
  @ApiOperation({ summary: 'Bulk create timetable for a class' })
  async bulkCreateSchedule(@Body() bulkDto: BulkCreateScheduleDto, @Request() req) {
    const data = await this.examsService.bulkCreateSchedule(bulkDto, req.user.instituteId);
    return { data, message: 'Exam schedule updated successfully' };
  }

  @Get(':id/schedule')
  @ApiOperation({ summary: 'Get timetable for a specific exam' })
  async getSchedule(@Param('id') id: string, @Request() req) {
    return this.examsService.getSchedule(id, req.user.instituteId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an exam' })
  async remove(@Param('id') id: string, @Request() req) {
    await this.examsService.remove(id, req.user.instituteId);
    return { message: 'Exam deleted successfully' };
  }
}
