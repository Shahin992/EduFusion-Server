import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { MongooseModule } from '@nestjs/mongoose';
import { ImportService } from './import.service';
import { ImportController } from './import.controller';
import { ImportProcessor } from './import.processor';
import { ImportJob, ImportJobSchema } from '../../schemas/import-job.schema';
import { Student, StudentSchema } from '../../schemas/student.schema';
import { User, UserSchema } from '../../schemas/user.schema';
import { AcademicClass, AcademicClassSchema } from '../../schemas/academic-class.schema';
import { AcademicSession, AcademicSessionSchema } from '../../schemas/academic-session.schema';
import { Institute, InstituteSchema } from '../../schemas/institute.schema';
import { StudentsModule } from '../students/students.module';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'import-queue',
    }),
    MongooseModule.forFeature([
      { name: ImportJob.name, schema: ImportJobSchema },
      { name: Student.name, schema: StudentSchema },
      { name: User.name, schema: UserSchema },
      { name: AcademicClass.name, schema: AcademicClassSchema },
      { name: AcademicSession.name, schema: AcademicSessionSchema },
      { name: Institute.name, schema: InstituteSchema },
    ]),
    StudentsModule, // Import this if you need to use StudentsService logic
  ],
  controllers: [ImportController],
  providers: [ImportService, ImportProcessor],
  exports: [ImportService],
})
export class ImportModule {}
