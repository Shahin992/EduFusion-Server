import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MarksController } from './marks.controller';
import { MarksService } from './marks.service';
import { Mark, MarkSchema } from '../../schemas/mark.schema';
import { ExamSchedule, ExamScheduleSchema } from '../../schemas/exam-schedule.schema';
import { Institute, InstituteSchema } from '../../schemas/institute.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Mark.name, schema: MarkSchema },
      { name: ExamSchedule.name, schema: ExamScheduleSchema },
      { name: Institute.name, schema: InstituteSchema },
    ]),
  ],
  controllers: [MarksController],
  providers: [MarksService],
  exports: [MarksService],
})
export class MarksModule {}
