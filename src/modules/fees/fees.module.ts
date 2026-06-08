import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BullModule } from '@nestjs/bullmq';
import { FeesService } from './fees.service';
import { FeesController } from './fees.controller';
import { FeesProcessor } from './fees.processor';
import { Fee, FeeSchema } from '../../schemas/fee.schema';
import { Student, StudentSchema } from '../../schemas/student.schema';
import { AcademicClass, AcademicClassSchema } from '../../schemas/academic-class.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Fee.name, schema: FeeSchema },
      { name: Student.name, schema: StudentSchema },
      { name: AcademicClass.name, schema: AcademicClassSchema },
    ]),
    BullModule.registerQueue({
      name: 'fees',
    }),
  ],
  controllers: [FeesController],
  providers: [FeesService, FeesProcessor],
})
export class FeesModule {}
