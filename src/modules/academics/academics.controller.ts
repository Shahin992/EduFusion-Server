import { Controller, Get, Post, Body, UseGuards, Request, Param, Patch, Delete } from '@nestjs/common';
import { AcademicsService } from './academics.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { SetMetadata } from '@nestjs/common';

import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

const Roles = (...roles: string[]) => SetMetadata('roles', roles);

@ApiTags('academics')
@ApiBearerAuth()
@Controller('academics')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AcademicsController {
  constructor(private readonly academicsService: AcademicsService) {}

  @Post('sessions')
  @Roles('admin')
  async createSession(@Request() req: any, @Body() data: any) {
    return this.academicsService.createSession(req.user.instituteId, data);
  }

  @Get('sessions')
  @Roles('admin', 'teacher')
  async getSessions(@Request() req: any) {
    const data = await this.academicsService.getSessions(req.user.instituteId);
    return { success: true, data };
  }

  @Post('classes')
  @Roles('admin')
  async createClass(@Request() req: any, @Body() data: any) {
    const result = await this.academicsService.createClass(req.user.instituteId, data);
    return { success: true, data: result };
  }

  @Get('classes')
  @Roles('admin', 'teacher')
  async getClasses(@Request() req: any) {
    const data = await this.academicsService.getClasses(req.user.instituteId);
    return { success: true, data };
  }

  @Patch('classes/:classId')
  @Roles('admin')
  async updateClass(@Request() req: any, @Param('classId') classId: string, @Body() data: any) {
    const result = await this.academicsService.updateClass(req.user.instituteId, classId, data);
    return { success: true, data: result };
  }

  @Delete('classes/:classId')
  @Roles('admin')
  async deleteClass(@Request() req: any, @Param('classId') classId: string) {
    const result = await this.academicsService.deleteClass(req.user.instituteId, classId);
    return { success: true, data: result };
  }

  @Post('subjects')
  @Roles('admin')
  async createSubject(@Request() req: any, @Body() data: any) {
    const result = await this.academicsService.createSubject(req.user.instituteId, data);
    return { success: true, data: result };
  }

  @Patch('subjects/:subjectId')
  @Roles('admin')
  async updateSubject(@Request() req: any, @Param('subjectId') subjectId: string, @Body() data: any) {
    const result = await this.academicsService.updateSubject(req.user.instituteId, subjectId, data);
    return { success: true, data: result };
  }

  @Delete('subjects/:subjectId')
  @Roles('admin')
  async deleteSubject(@Request() req: any, @Param('subjectId') subjectId: string) {
    const result = await this.academicsService.deleteSubject(req.user.instituteId, subjectId);
    return { success: true, data: result };
  }

  @Get('classes/:classId/subjects')
  @Roles('admin', 'teacher')
  async getSubjects(@Request() req: any, @Param('classId') classId: string) {
    const data = await this.academicsService.getSubjectsByClass(req.user.instituteId, classId);
    return { success: true, data };
  }
}
