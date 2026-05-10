import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { FeesService } from './fees.service';
import { FeesController } from './fees.controller';
import { Fee, FeeSchema } from '../../schemas/fee.schema';
import { Student, StudentSchema } from '../../schemas/student.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Fee.name, schema: FeeSchema },
      { name: Student.name, schema: StudentSchema },
    ]),
  ],
  controllers: [FeesController],
  providers: [FeesService],
})
export class FeesModule {}
