import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { Student, StudentSchema } from '../../schemas/student.schema';
import { Teacher, TeacherSchema } from '../../schemas/teacher.schema';
import { Fee, FeeSchema } from '../../schemas/fee.schema';
import { AcademicClass, AcademicClassSchema } from '../../schemas/academic-class.schema';
import { Exam, ExamSchema } from '../../schemas/exam.schema';
import { Mark, MarkSchema } from '../../schemas/mark.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Student.name, schema: StudentSchema },
      { name: Teacher.name, schema: TeacherSchema },
      { name: Fee.name, schema: FeeSchema },
      { name: AcademicClass.name, schema: AcademicClassSchema },
      { name: Exam.name, schema: ExamSchema },
      { name: Mark.name, schema: MarkSchema },
    ]),
  ],
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
})
export class AnalyticsModule {}
