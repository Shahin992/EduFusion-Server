import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { InstitutesService } from './institutes.service';
import { InstitutesController } from './institutes.controller';
import { Institute, InstituteSchema } from '../../schemas/institute.schema';
import { AcademicSession, AcademicSessionSchema } from '../../schemas/academic-session.schema';
import { AcademicClass, AcademicClassSchema } from '../../schemas/academic-class.schema';
import { Subject, SubjectSchema } from '../../schemas/subject.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Institute.name, schema: InstituteSchema },
      { name: AcademicSession.name, schema: AcademicSessionSchema },
      { name: AcademicClass.name, schema: AcademicClassSchema },
      { name: Subject.name, schema: SubjectSchema },
    ]),
  ],
  controllers: [InstitutesController],
  providers: [InstitutesService],
  exports: [InstitutesService, MongooseModule],
})
export class InstitutesModule {}
