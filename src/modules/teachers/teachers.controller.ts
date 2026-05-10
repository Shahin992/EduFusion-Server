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
import { TeachersService } from './teachers.service';
import { CreateTeacherDto } from './dto/create-teacher.dto';
import { UpdateTeacherDto } from './dto/update-teacher.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Teachers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('teachers')
export class TeachersController {
  constructor(private readonly teachersService: TeachersService) {}

  @Post()
  @ApiOperation({ summary: 'Add a new teacher' })
  create(@Body() createTeacherDto: CreateTeacherDto, @Request() req) {
    return this.teachersService.create(createTeacherDto, req.user.instituteId);
  }

  @Get()
  @ApiOperation({ summary: 'Get all teachers' })
  findAll(
    @Request() req, 
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.teachersService.findAll(req.user.instituteId, { 
      search,
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 10,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get teacher by ID' })
  findOne(@Param('id') id: string, @Request() req) {
    return this.teachersService.findOne(id, req.user.instituteId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update teacher profile' })
  update(
    @Param('id') id: string,
    @Body() updateTeacherDto: UpdateTeacherDto,
    @Request() req,
  ) {
    return this.teachersService.update(id, updateTeacherDto, req.user.instituteId);
  }

  @Patch(':id/allocate-subjects')
  @ApiOperation({ summary: 'Allocate subjects to teacher' })
  allocateSubjects(
    @Param('id') id: string,
    @Body('subjectIds') subjectIds: string[],
    @Request() req,
  ) {
    return this.teachersService.allocateSubjects(id, subjectIds, req.user.instituteId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a teacher' })
  remove(@Param('id') id: string, @Request() req) {
    return this.teachersService.remove(id, req.user.instituteId);
  }
}
