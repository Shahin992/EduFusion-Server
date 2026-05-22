import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ExamsController } from './exams.controller';
import { ExamsService } from './exams.service';
import { Exam, ExamSchema } from '../../schemas/exam.schema';
import { ExamSchedule, ExamScheduleSchema } from '../../schemas/exam-schedule.schema';
import { AcademicClass, AcademicClassSchema } from '../../schemas/academic-class.schema';
import { AcademicSession, AcademicSessionSchema } from '../../schemas/academic-session.schema';
import { Subject, SubjectSchema } from '../../schemas/subject.schema';
import { Mark, MarkSchema } from '../../schemas/mark.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Exam.name, schema: ExamSchema },
      { name: ExamSchedule.name, schema: ExamScheduleSchema },
      { name: AcademicClass.name, schema: AcademicClassSchema },
      { name: AcademicSession.name, schema: AcademicSessionSchema },
      { name: Subject.name, schema: SubjectSchema },
      { name: Mark.name, schema: MarkSchema },
    ]),
  ],
  controllers: [ExamsController],
  providers: [ExamsService],
  exports: [ExamsService],
})
export class ExamsModule {}
