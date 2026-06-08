import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AcademicClass } from './schemas/academic-class.schema';
import { Institute } from './schemas/institute.schema';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  
  const classModel = app.get<Model<AcademicClass>>(getModelToken('AcademicClass'));
  const instituteModel = app.get<Model<Institute>>(getModelToken('Institute'));

  console.log('Starting migration...');

  const institutes = await instituteModel.find().exec();
  let updatedCount = 0;

  for (const institute of institutes) {
    const classes = await classModel.find({ instituteId: institute._id }).sort({ createdAt: 1 }).exec();
    
    let currentCode = 1;
    for (const cls of classes) {
      let needsUpdate = false;
      const updateData: any = {};

      if (!cls.classCode) {
        updateData.classCode = currentCode;
        needsUpdate = true;
      }
      
      if (cls.monthlyFee === undefined || cls.monthlyFee === null) {
        updateData.monthlyFee = 0;
        needsUpdate = true;
      }

      if (cls.admissionFee === undefined || cls.admissionFee === null) {
        updateData.admissionFee = 0;
        needsUpdate = true;
      }

      if (needsUpdate) {
        await classModel.updateOne({ _id: cls._id }, { $set: updateData });
        updatedCount++;
        console.log(`Updated class "${cls.name}" for institute "${institute.name}" with data:`, updateData);
      }
      
      currentCode++;
    }
  }

  console.log(`Migration complete! Updated ${updatedCount} classes.`);
  await app.close();
  process.exit(0);
}

bootstrap();
