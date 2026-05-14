import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Student } from '../../schemas/student.schema';
import { User } from '../../schemas/user.schema';
import { AcademicClass } from '../../schemas/academic-class.schema';
import { AcademicSession } from '../../schemas/academic-session.schema';
import { Institute } from '../../schemas/institute.schema';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class StudentsService {
  constructor(
    @InjectModel(Student.name) private studentModel: Model<Student>,
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(AcademicClass.name) private classModel: Model<AcademicClass>,
    @InjectModel(AcademicSession.name) private sessionModel: Model<AcademicSession>,
    @InjectModel(Institute.name) private instituteModel: Model<Institute>,
  ) {}

  private async assertClassBelongsToInstitute(classId: string, instituteId: string) {
    const targetClass = await this.classModel.findOne({
      _id: new Types.ObjectId(classId),
      instituteId: new Types.ObjectId(instituteId),
    });

    if (!targetClass) {
      throw new NotFoundException('Class not found for this institute');
    }
  }

  private async assertSessionBelongsToInstitute(sessionId: string, instituteId: string) {
    const targetSession = await this.sessionModel.findOne({
      _id: new Types.ObjectId(sessionId),
      instituteId: new Types.ObjectId(instituteId),
    });

    if (!targetSession) {
      throw new NotFoundException('Academic session not found for this institute');
    }
  }

  async create(createStudentDto: CreateStudentDto, instituteId: string): Promise<Student> {
    const { classId } = createStudentDto;
    let { academicSessionId, rollNumber, registrationNumber } = createStudentDto;

    const instId = new Types.ObjectId(instituteId);
    await this.assertClassBelongsToInstitute(classId, instituteId);
    
    // Auto-select active session if missing
    if (!academicSessionId) {
      const activeSession = await this.sessionModel.findOne({ instituteId: instId, isActive: true });
      if (activeSession) {
        academicSessionId = activeSession._id.toString();
      }
    }

    if (academicSessionId) {
      await this.assertSessionBelongsToInstitute(academicSessionId, instituteId);
    }

    const sessId = academicSessionId ? new Types.ObjectId(academicSessionId) : null;
    const clsId = new Types.ObjectId(classId);

    // Auto-generate roll number if not provided
    if (!rollNumber && sessId) {
      const lastStudent = await this.studentModel
        .findOne({ instituteId: instId, academicSessionId: sessId, classId: clsId })
        .sort({ rollNumber: -1 }) // Sort by rollNumber descending
        .collation({ locale: 'en_US', numericOrdering: true })
        .exec();
      
      if (lastStudent) {
        const lastRoll = parseInt(lastStudent.rollNumber);
        rollNumber = isNaN(lastRoll) ? "1" : (lastRoll + 1).toString();
      } else {
        rollNumber = "1";
      }
    } else {
      // Check for duplicate roll number if provided manually
      const existingRoll = await this.studentModel.findOne({
        instituteId: instId,
        academicSessionId: sessId,
        classId: clsId,
        rollNumber,
      });
      if (existingRoll) {
        throw new ConflictException(`Roll number ${rollNumber} already exists in this class for this session`);
      }
    }

    // Auto-generate registration number if not provided
    if (!registrationNumber) {
      const year = new Date().getFullYear();
      const institute = await this.instituteModel.findById(instId);
      const targetClass = await this.classModel.findById(clsId);

      const instCode = (institute?.instituteCode || 1).toString().padStart(2, '0');
      const clsCode = (targetClass?.classCode || 1).toString().padStart(2, '0');
      const rollSuffix = (parseInt(rollNumber) || 1).toString().padStart(2, '0');

      registrationNumber = `${year}${instCode}${clsCode}${rollSuffix}`;

      // Check if this generated registration number already exists (unlikely but safe)
      const existingReg = await this.studentModel.findOne({ instituteId: instId, registrationNumber });
      if (existingReg) {
        // Fallback to incremental if there's a collision
        const lastReg = await this.studentModel.findOne({ instituteId: instId }).sort({ registrationNumber: -1 }).exec();
        const lastNum = lastReg ? parseInt(lastReg.registrationNumber.slice(-2)) : 0;
        registrationNumber = `${year}${instCode}${clsCode}${(lastNum + 1).toString().padStart(2, '0')}`;
      }
    } else {
      const existingReg = await this.studentModel.findOne({ instituteId: instId, registrationNumber });
      if (existingReg) throw new ConflictException(`Registration number ${registrationNumber} already exists`);
    }

    // Double check Roll Number uniqueness if provided
    if (rollNumber) {
      const existingRoll = await this.studentModel.findOne({
        instituteId: instId,
        academicSessionId: sessId,
        classId: clsId,
        rollNumber,
      });
      if (existingRoll) throw new ConflictException(`Roll number ${rollNumber} already exists in this class`);
    }

    const createdStudent = new this.studentModel({
      ...createStudentDto,
      academicSessionId: sessId,
      classId: clsId,
      rollNumber,
      registrationNumber,
      instituteId: instId,
    });

    try {
      const savedStudent = await createdStudent.save();

      try {
        // Create a User record for the student portal
        // Append institute short ID to ensure global email uniqueness
        const studentEmail = `${registrationNumber.toLowerCase()}.${instituteId.slice(-5)}@edufusion.com`;
        const hashedPassword = await bcrypt.hash(registrationNumber, 10); // Default password is Registration Number

        await this.studentModel.updateOne(
          { _id: savedStudent._id },
          { $set: { portalEmail: studentEmail } }
        );

        await this.userModel.create({
          email: studentEmail,
          passwordHash: hashedPassword,
          name: savedStudent.name,
          role: 'student',
          instituteId: instId,
          studentId: savedStudent._id,
          isActive: true,
        });

        return savedStudent;
      } catch (userError) {
        // Rollback student creation if user creation fails
        await this.studentModel.deleteOne({ _id: savedStudent._id });
        
        if (userError.code === 11000) {
          throw new ConflictException('A student user with this email or registration already exists in the portal system.');
        }
        throw userError;
      }
    } catch (error) {
      if (error instanceof ConflictException) throw error;

      if (error.code === 11000) {
        const keyPattern = error.keyPattern || {};
        if (keyPattern.rollNumber || error.message.includes('rollNumber')) {
          throw new ConflictException(`Roll number ${rollNumber} is already assigned to another student in this class.`);
        }
        if (keyPattern.registrationNumber || error.message.includes('registrationNumber')) {
          throw new ConflictException(`Registration number ${registrationNumber} already exists in this institute.`);
        }
        throw new ConflictException('A student with similar unique details (Roll or Registration) already exists.');
      }
      throw error;
    }
  }

  async findAll(
    instituteId: string,
    query: { classId?: string; sessionId?: string; search?: string; page?: number; limit?: number },
  ) {
    const { classId, sessionId, search, page = 1, limit = 10 } = query;
    const filter: any = { instituteId: new Types.ObjectId(instituteId) };

    if (classId && classId !== 'undefined' && classId !== 'null' && classId !== '') {
      filter.classId = new Types.ObjectId(classId);
    }
    if (sessionId && sessionId !== 'undefined' && sessionId !== 'null' && sessionId !== '') {
      filter.academicSessionId = new Types.ObjectId(sessionId);
    }
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { rollNumber: { $regex: search, $options: 'i' } },
        { registrationNumber: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (page - 1) * limit;
    const [students, total] = await Promise.all([
      this.studentModel
        .find(filter)
        .populate('classId', 'name')
        .populate('academicSessionId', 'name')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.studentModel.countDocuments(filter),
    ]);

    return {
      students,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string, instituteId: string): Promise<Student> {
    const student = await this.studentModel
      .findOne({ _id: new Types.ObjectId(id), instituteId: new Types.ObjectId(instituteId) })
      .populate('classId')
      .populate('academicSessionId')
      .exec();

    if (!student) {
      throw new NotFoundException('Student not found');
    }
    return student;
  }



  private parseCsv(content: string) {
    const lines = content
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    if (lines.length < 2) {
      throw new BadRequestException('CSV must include a header row and at least one student row');
    }

    const headers = lines[0].split(',').map((header) => header.trim());
    return lines.slice(1).map((line) => {
      const values = line.split(',').map((value) => value.trim());
      return headers.reduce((row, header, index) => {
        row[header] = values[index] || '';
        return row;
      }, {} as Record<string, string>);
    });
  }

  async bulkImport(fileBuffer: Buffer, instituteId: string) {
    const rows = this.parseCsv(fileBuffer.toString('utf8'));
    const imported = [];
    const failed = [];

    for (const [index, row] of rows.entries()) {
      try {
        if (!row.name || !row.classId) {
          throw new BadRequestException('name and classId are required');
        }

        const payload: CreateStudentDto = {
          name: row.name,
          classId: row.classId,
          academicSessionId: row.academicSessionId || undefined,
          rollNumber: row.rollNumber || undefined,
          registrationNumber: row.registrationNumber || undefined,
          phone: row.phone || undefined,
          email: row.email || undefined,
          fatherName: row.fatherName || undefined,
          fatherPhone: row.fatherPhone || undefined,
          motherName: row.motherName || undefined,
          motherPhone: row.motherPhone || undefined,
          address: row.address || undefined,
          monthlyFees: row.monthlyFees || undefined,
          gender: (row.gender as any) || undefined,
        };

        imported.push(await this.create(payload, instituteId));
      } catch (error) {
        failed.push({
          row: index + 2,
          name: row.name || '',
          reason: error?.message || 'Import failed',
        });
      }
    }

    return {
      importedCount: imported.length,
      failedCount: failed.length,
      failed,
    };
  }

  async update(id: string, updateStudentDto: UpdateStudentDto, instituteId: string): Promise<Student> {
    if (updateStudentDto.classId) {
      await this.assertClassBelongsToInstitute(updateStudentDto.classId, instituteId);
    }

    if (updateStudentDto.academicSessionId) {
      await this.assertSessionBelongsToInstitute(updateStudentDto.academicSessionId, instituteId);
    }

    try {
      const student = await this.studentModel.findOneAndUpdate(
        { _id: new Types.ObjectId(id), instituteId: new Types.ObjectId(instituteId) },
        { $set: updateStudentDto },
        { new: true },
      );

      if (!student) {
        throw new NotFoundException('Student not found');
      }

      // Sync name in User portal if name changed
      if (updateStudentDto.name) {
        await this.userModel.updateOne(
          { studentId: new Types.ObjectId(id) },
          { $set: { name: updateStudentDto.name } }
        );
      }

      return student;
    } catch (error) {
      if (error.code === 11000) {
        const keyPattern = error.keyPattern || {};
        if (keyPattern.rollNumber || error.message.includes('rollNumber')) {
          throw new ConflictException(`Update failed: Roll number is already assigned to another student in this class.`);
        }
        if (keyPattern.registrationNumber || error.message.includes('registrationNumber')) {
          throw new ConflictException(`Update failed: Registration number already exists in this institute.`);
        }
        throw new ConflictException('Update failed: A student with similar unique details already exists.');
      }
      throw error;
    }
  }

  async remove(id: string, instituteId: string) {
    const result = await this.studentModel.deleteOne({
      _id: new Types.ObjectId(id),
      instituteId: new Types.ObjectId(instituteId),
    });

    if (result.deletedCount === 0) {
      throw new NotFoundException('Student not found');
    }
    return { message: 'Student deleted successfully' };
  }
}
