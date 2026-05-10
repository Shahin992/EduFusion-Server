import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ResultsService } from './results.service';
import { ResultsController } from './results.controller';
import { Mark, MarkSchema } from '../../schemas/mark.schema';
import { Institute, InstituteSchema } from '../../schemas/institute.schema';
import { Exam, ExamSchema } from '../../schemas/exam.schema';
import { Student, StudentSchema } from '../../schemas/student.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Mark.name, schema: MarkSchema },
      { name: Institute.name, schema: InstituteSchema },
      { name: Exam.name, schema: ExamSchema },
      { name: Student.name, schema: StudentSchema },
    ]),
  ],
  controllers: [ResultsController],
  providers: [ResultsService],
})
export class ResultsModule {}
