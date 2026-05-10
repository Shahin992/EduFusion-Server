import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Body,
  UseInterceptors,
  UploadedFile,
  UseGuards,
  Request,
  Query,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AiLabService } from './ai-lab.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('AI Lab')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('ai-lab')
export class AiLabController {
  constructor(private readonly aiLabService: AiLabService) {}

  @Post('generate')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Generate questions from uploaded PDF' })
  async generate(
    @UploadedFile() file: any,
    @Body('subject') subject: string,
    @Body('class') className: string,
    @Body('examName') examName: string,
    @Body('mcqCount') mcqCount: string,
    @Body('cqCount') cqCount: string,
    @Body('totalMarks') totalMarks: string,
    @Body('language') language: string,
    @Body('questionType') questionType: string,
    @Body('difficulty') difficulty: string,
    @Body('time') time: string,
    @Request() req,
  ) {
    const options = {
      subject,
      class: className,
      examName,
      mcqCount: parseInt(mcqCount) || 0,
      cqCount: parseInt(cqCount) || 0,
      totalMarks: parseInt(totalMarks) || 100,
      language: language || 'English',
      questionType: questionType || 'BOTH',
      difficulty: difficulty || 'Medium',
      time: time || '1.30 hr',
    };

    const data = await this.aiLabService.generateQuestions(
      file ? file.buffer : Buffer.alloc(0), 
      options, 
      req.user.sub, 
      req.user.instituteId
    );
    return { data, message: 'Question set generated successfully' };
  }

  @Get('sets')
  @ApiOperation({ summary: 'Get saved AI question sets' })
  async getQuestionSets(@Request() req, @Query('subject') subject?: string) {
    return this.aiLabService.getQuestionSets(req.user.instituteId, subject);
  }

  @Get('sets/:id')
  @ApiOperation({ summary: 'Get a specific question set' })
  async getQuestionSet(@Param('id') id: string, @Request() req) {
    return this.aiLabService.getQuestionSet(id, req.user.instituteId);
  }

  @Delete('sets/:id')
  @ApiOperation({ summary: 'Delete a question set' })
  async deleteQuestionSet(@Param('id') id: string, @Request() req) {
    await this.aiLabService.deleteQuestionSet(id, req.user.instituteId);
    return { message: 'Question set deleted successfully' };
  }

  @Post('refine')
  @ApiOperation({ summary: 'Regenerate specific questions in a draft' })
  async refine(
    @Body('draft') draft: any,
    @Body('indices') indices: number[],
  ) {
    const data = await this.aiLabService.refineQuestionsDraft(draft, indices);
    return { data, message: 'Questions refined successfully' };
  }

  @Post('finalize')
  @ApiOperation({ summary: 'Save the finalized question set' })
  async finalize(
    @Body('draft') draft: any,
    @Request() req,
  ) {
    const data = await this.aiLabService.saveFinalizedSet(draft, req.user.sub, req.user.instituteId);
    return { data, message: 'Question set finalized and saved successfully' };
  }
}
