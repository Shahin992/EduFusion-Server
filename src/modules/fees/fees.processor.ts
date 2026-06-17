import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Fee } from '../../schemas/fee.schema';
import { Student } from '../../schemas/student.schema';
import { AcademicClass } from '../../schemas/academic-class.schema';

@Processor('fees')
@Injectable()
export class FeesProcessor extends WorkerHost {
  private readonly logger = new Logger(FeesProcessor.name);

  constructor(
    @InjectModel(Fee.name) private feeModel: Model<Fee>,
    @InjectModel(Student.name) private studentModel: Model<Student>,
    @InjectModel(AcademicClass.name) private academicClassModel: Model<AcademicClass>,
  ) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    this.logger.log(`Processing job ${job.id} of type ${job.name}...`);

    if (job.name === 'generate-monthly-fees') {
      await this.handleGenerateMonthlyFees(job);
    } else if (job.name === 'generate-initial-fees') {
      await this.handleGenerateInitialFees(job);
    } else if (job.name === 'generate-custom-bulk-fees') {
      await this.handleGenerateCustomBulkFees(job);
    }
  }

  private async handleGenerateMonthlyFees(job: Job) {
    const { currentMonth } = job.data;
    this.logger.log(`Generating monthly fees for ${currentMonth}...`);
    
    try {
      const activeStudents = await this.studentModel.find({ status: 'Active' });
      const classes = await this.academicClassModel.find();
      
      const classFeeMap = new Map();
      for (const cls of classes) {
        classFeeMap.set(cls._id.toString(), cls.monthlyFee);
      }

      const feesToInsert = [];

      for (const student of activeStudents) {
        let expectedFee = student.monthlyFees;
        if (expectedFee === undefined || expectedFee === null) {
          expectedFee = classFeeMap.get(student.classId.toString()) || 0;
        }

        if (expectedFee <= 0) continue; 

        // Check if fee already exists for this month to prevent duplicates
        const existingFee = await this.feeModel.findOne({
          studentId: student._id,
          instituteId: student.instituteId,
          feeType: 'Monthly',
          month: currentMonth
        });

        if (!existingFee) {
          const receiptNumber = `EF-${new Date().getFullYear()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
          feesToInsert.push({
            studentId: student._id,
            instituteId: student.instituteId,
            feeType: 'Monthly',
            month: currentMonth,
            totalAmount: expectedFee,
            amount: 0,
            dueAmount: expectedFee,
            status: 'Pending',
            paymentDate: new Date(),
            receiptNumber,
            note: 'Auto-generated Monthly Fee'
          });
        }
      }

      if (feesToInsert.length > 0) {
        await this.feeModel.insertMany(feesToInsert);
        this.logger.log(`Success: Generated ${feesToInsert.length} pending fees for ${currentMonth}`);
      } else {
        this.logger.log('Notice: No new monthly fees to generate (all exist or no active students).');
      }
    } catch (error) {
      this.logger.error('Error generating monthly fees', error);
      throw error; // Throw error to trigger BullMQ retry mechanisms
    }
  }

  private async handleGenerateInitialFees(job: Job) {
    const { studentId, initialMonthFee, admissionFeeOverride } = job.data;
    this.logger.log(`Generating initial fees for newly enrolled student: ${studentId}`);
    
    try {
      const student = await this.studentModel.findById(studentId);
      if (!student) {
        this.logger.warn(`Student ${studentId} not found, skipping initial fees generation.`);
        return;
      }

      const currentMonth = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });
      const cls = await this.academicClassModel.findById(student.classId);
      const baseFee = cls ? cls.monthlyFee : 0;

      let expectedFee = student.monthlyFees;
      if (expectedFee === undefined || expectedFee === null) {
        expectedFee = baseFee;
      }

      let finalMonthlyFee = expectedFee;
      let note = `Auto-generated First Monthly Fee`;

      if (initialMonthFee !== undefined && initialMonthFee !== null) {
        finalMonthlyFee = Number(initialMonthFee);
        note = 'Auto-generated First Monthly Fee (Custom Override)';
      }

      const feesToInsert = [];

      // Generate Current Monthly Fee
      if (finalMonthlyFee > 0) {
        const existingMonthly = await this.feeModel.findOne({
          studentId: student._id,
          instituteId: student.instituteId,
          feeType: 'Monthly',
          month: currentMonth
        });

        if (!existingMonthly) {
          feesToInsert.push({
            studentId: student._id,
            instituteId: student.instituteId,
            feeType: 'Monthly',
            month: currentMonth,
            totalAmount: finalMonthlyFee,
            amount: 0,
            dueAmount: finalMonthlyFee,
            status: 'Pending',
            paymentDate: new Date(),
            receiptNumber: `EF-${new Date().getFullYear()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
            note: note
          });
        }
      }

      // Generate Admission Fee (using the new class-level admissionFee or override)
      let baseAdmissionFee = cls ? (cls.admissionFee || 0) : 0;
      let admissionNote = 'Auto-generated Admission Fee';

      if (admissionFeeOverride !== undefined && admissionFeeOverride !== null && admissionFeeOverride !== '') {
        baseAdmissionFee = Number(admissionFeeOverride);
        admissionNote = 'Auto-generated Admission Fee (Custom Override)';
      }

      if (baseAdmissionFee > 0) {
        const existingAdmission = await this.feeModel.findOne({
          studentId: student._id,
          instituteId: student.instituteId,
          feeType: 'Admission'
        });

        if (!existingAdmission) {
          feesToInsert.push({
            studentId: student._id,
            instituteId: student.instituteId,
            feeType: 'Admission',
            totalAmount: baseAdmissionFee,
            amount: 0,
            dueAmount: baseAdmissionFee,
            status: 'Pending',
            paymentDate: new Date(),
            receiptNumber: `EF-${new Date().getFullYear()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
            note: admissionNote
          });
        }
      }

      if (feesToInsert.length > 0) {
        await this.feeModel.insertMany(feesToInsert);
        this.logger.log(`Success: Generated ${feesToInsert.length} initial fee(s) for student ${studentId}`);
      }
    } catch (error) {
      this.logger.error(`Error generating initial fees for student ${studentId}`, error);
      throw error;
    }
  }

  private async handleGenerateCustomBulkFees(job: Job) {
    const { instituteId, classId, feeType, feeName, amount, month } = job.data;
    this.logger.log(`Generating custom bulk fees: ${feeType} - ${feeName || month || ''} for ${classId ? 'Class: '+classId : 'All Classes'}`);

    try {
      const filter: any = { 
        instituteId: new Types.ObjectId(instituteId), 
        status: 'Active' 
      };
      if (classId && classId !== 'all') {
        filter.classId = new Types.ObjectId(classId);
      }

      const students = await this.studentModel.find(filter).select('_id').lean();
      if (students.length === 0) {
        this.logger.log('No active students found for bulk generation.');
        return;
      }

      const feeQuery: any = {
        instituteId: new Types.ObjectId(instituteId),
        feeType,
        totalAmount: Number(amount),
      };
      if (feeType === 'Monthly' && month) feeQuery.month = month;
      if (feeType === 'Other' && feeName) feeQuery.note = new RegExp(`^${feeName}$`, 'i');
      if (feeType === 'Exam') feeQuery.note = 'Exam Fee';

      const existingFees = await this.feeModel.find(feeQuery).select('studentId').lean();
      const existingStudentIds = new Set(existingFees.map(f => f.studentId.toString()));

      const feesToInsert = [];
      const note = feeType === 'Other' ? feeName : (feeType === 'Monthly' ? `Monthly Fee for ${month}` : `${feeType} Fee`);

      for (const student of students) {
        if (!existingStudentIds.has(student._id.toString())) {
          feesToInsert.push({
            studentId: student._id,
            instituteId: new Types.ObjectId(instituteId),
            feeType,
            month: feeType === 'Monthly' ? month : undefined,
            amount: 0,
            totalAmount: Number(amount),
            dueAmount: Number(amount),
            status: 'Pending',
            paymentDate: new Date(),
            receiptNumber: `EF-${new Date().getFullYear()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
            note: note
          });
        }
      }

      if (feesToInsert.length > 0) {
        await this.feeModel.insertMany(feesToInsert);
        this.logger.log(`Successfully generated ${feesToInsert.length} custom pending fees.`);
      } else {
        this.logger.log('No new custom fees to generate. All students already have this bill.');
      }
    } catch (error) {
      this.logger.error('Failed to generate custom bulk fees', error);
      throw error;
    }
  }
}
