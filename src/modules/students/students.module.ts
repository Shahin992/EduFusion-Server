import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BullModule } from '@nestjs/bullmq';
import { StudentsService } from './students.service';
import { StudentsController } from './students.controller';
import { Student, StudentSchema } from '../../schemas/student.schema';
import { AcademicClass, AcademicClassSchema } from '../../schemas/academic-class.schema';
import { AcademicSession, AcademicSessionSchema } from '../../schemas/academic-session.schema';
import { Institute, InstituteSchema } from '../../schemas/institute.schema';
import { User, UserSchema } from '../../schemas/user.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Student.name, schema: StudentSchema },
      { name: AcademicClass.name, schema: AcademicClassSchema },
      { name: AcademicSession.name, schema: AcademicSessionSchema },
      { name: Institute.name, schema: InstituteSchema },
      { name: User.name, schema: UserSchema },
    ]),
    BullModule.registerQueue({
      name: 'fees',
    }),
  ],
  controllers: [StudentsController],
  providers: [StudentsService],
  exports: [StudentsService],
})
export class StudentsModule {}
