import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AcademicsController } from './academics.controller';
import { AcademicsService } from './academics.service';
import { AcademicSession, AcademicSessionSchema } from '../../schemas/academic-session.schema';
import { AcademicClass, AcademicClassSchema } from '../../schemas/academic-class.schema';
import { Subject, SubjectSchema } from '../../schemas/subject.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: AcademicSession.name, schema: AcademicSessionSchema },
      { name: AcademicClass.name, schema: AcademicClassSchema },
      { name: Subject.name, schema: SubjectSchema },
    ]),
  ],
  controllers: [AcademicsController],
  providers: [AcademicsService],
  exports: [AcademicsService],
})
export class AcademicsModule {}
