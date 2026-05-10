import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SalariesService } from './salaries.service';
import { SalariesController } from './salaries.controller';
import { Salary, SalarySchema } from '../../schemas/salary.schema';
import { Teacher, TeacherSchema } from '../../schemas/teacher.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Salary.name, schema: SalarySchema },
      { name: Teacher.name, schema: TeacherSchema },
    ]),
  ],
  controllers: [SalariesController],
  providers: [SalariesService],
})
export class SalariesModule {}
