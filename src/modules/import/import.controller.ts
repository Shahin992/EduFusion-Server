import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  Request,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ImportService } from './import.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Import')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('import')
export class ImportController {
  constructor(private readonly importService: ImportService) {}

  @Post('analyze')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Analyze CSV headers for mapping' })
  async analyze(@UploadedFile() file: any) {
    if (!file) {
      throw new BadRequestException('CSV file is required');
    }

    const content = file.buffer.toString('utf8');
    const lines = content.split(/\r?\n/).filter(Boolean);
    
    if (lines.length < 1) {
      throw new BadRequestException('Empty CSV file');
    }

    const headers = lines[0].split(',').map((h) => h.trim());
    const preview = lines.slice(1, 4).map((line) => {
      const values = line.split(',').map((v) => v.trim());
      return headers.reduce((row, header, index) => {
        row[header] = values[index] || '';
        return row;
      }, {} as any);
    });

    return { headers, preview };
  }

  @Post('students')
  @ApiOperation({ summary: 'Initiate bulk student import' })
  async importStudents(@Body() body: any, @Request() req) {
    const { data, mapping, classId, academicSessionId } = body;

    if (!data || !mapping || !classId) {
      throw new BadRequestException('Data, mapping, and classId are required');
    }

    const job = await this.importService.createImportJob(
      req.user.instituteId,
      'students',
      data,
      mapping,
      { classId, academicSessionId },
    );

    return { success: true, jobId: job._id };
  }

  @Get('status/:jobId')
  @ApiOperation({ summary: 'Check status of an import job' })
  async getStatus(@Param('jobId') jobId: string, @Request() req) {
    return this.importService.getImportStatus(jobId, req.user.instituteId);
  }
}
