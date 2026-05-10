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
  Res,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { StudentsService } from './students.service';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Students')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('students')
export class StudentsController {
  constructor(private readonly studentsService: StudentsService) {}

  @Post()
  @ApiOperation({ summary: 'Enroll a new student' })
  async create(@Body() createStudentDto: CreateStudentDto, @Request() req) {
    const data = await this.studentsService.create(createStudentDto, req.user.instituteId);
    return { success: true, data };
  }

  @Post('bulk-import')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Bulk import students from CSV' })
  async bulkImport(@UploadedFile() file: any, @Request() req) {
    if (!file) {
      throw new BadRequestException('CSV file is required');
    }

    const data = await this.studentsService.bulkImport(file.buffer, req.user.instituteId);
    return { success: true, data };
  }

  @Get()
  @ApiOperation({ summary: 'Get all students with filters' })
  async findAll(
    @Request() req,
    @Query('classId') classId?: string,
    @Query('sessionId') sessionId?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const data = await this.studentsService.findAll(req.user.instituteId, {
      classId,
      sessionId,
      search,
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 10,
    });
    return { success: true, data };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get student by ID' })
  async findOne(@Param('id') id: string, @Request() req) {
    const data = await this.studentsService.findOne(id, req.user.instituteId);
    return { success: true, data };
  }



  @Patch(':id')
  @ApiOperation({ summary: 'Update student profile' })
  async update(
    @Param('id') id: string,
    @Body() updateStudentDto: UpdateStudentDto,
    @Request() req,
  ) {
    const data = await this.studentsService.update(id, updateStudentDto, req.user.instituteId);
    return { success: true, data };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a student' })
  async remove(@Param('id') id: string, @Request() req) {
    const data = await this.studentsService.remove(id, req.user.instituteId);
    return { success: true, data };
  }
}
