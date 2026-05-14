import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AcademicSession } from '../../schemas/academic-session.schema';
import { AcademicClass } from '../../schemas/academic-class.schema';
import { Subject } from '../../schemas/subject.schema';

@Injectable()
export class AcademicsService {
  constructor(
    @InjectModel(AcademicSession.name) private sessionModel: Model<AcademicSession>,
    @InjectModel(AcademicClass.name) private classModel: Model<AcademicClass>,
    @InjectModel(Subject.name) private subjectModel: Model<Subject>,
  ) {}

  // Session Methods
  async createSession(instituteId: string, data: any) {
    if (!data.name || !data.startDate || !data.endDate) {
      throw new BadRequestException('Session name, start date and end date are required');
    }

    if (new Date(data.startDate) > new Date(data.endDate)) {
      throw new BadRequestException('Start date cannot be after end date');
    }

    if (data.isActive) {
      await this.sessionModel.updateMany({ instituteId }, { isActive: false });
    }
    const session = new this.sessionModel({ ...data, instituteId: new Types.ObjectId(instituteId) });
    return session.save();
  }

  async getSessions(instituteId: string) {
    return this.sessionModel
      .find({ instituteId: new Types.ObjectId(instituteId) })
      .sort({ startDate: -1 });
  }

  async updateSession(instituteId: string, sessionId: string, data: any) {
    if (data.isActive) {
      await this.sessionModel.updateMany(
        { instituteId: new Types.ObjectId(instituteId), _id: { $ne: new Types.ObjectId(sessionId) } },
        { isActive: false }
      );
    }
    const updatedSession = await this.sessionModel.findOneAndUpdate(
      { _id: new Types.ObjectId(sessionId), instituteId: new Types.ObjectId(instituteId) },
      { $set: data },
      { new: true }
    );
    if (!updatedSession) throw new NotFoundException('Session not found');
    return updatedSession;
  }

  async deleteSession(instituteId: string, sessionId: string) {
    const session = await this.sessionModel.findOne({
      _id: new Types.ObjectId(sessionId),
      instituteId: new Types.ObjectId(instituteId)
    });
    if (!session) throw new NotFoundException('Session not found');
    if (session.isActive) throw new BadRequestException('Cannot delete an active session');
    
    await this.sessionModel.deleteOne({ _id: new Types.ObjectId(sessionId) });
    return { success: true };
  }

  // Class Methods
  async createClass(instituteId: string, data: any) {
    if (!data.name || data.name.trim() === '') {
      throw new BadRequestException('Class name is required');
    }

    const existingClass = await this.classModel.findOne({ 
      instituteId: new Types.ObjectId(instituteId), 
      name: data.name.trim() 
    });
    
    if (existingClass) {
      throw new BadRequestException(`Class "${data.name}" already exists`);
    }

    const academicClass = new this.classModel({ 
      ...data, 
      name: data.name.trim(),
      instituteId: new Types.ObjectId(instituteId) 
    });
    return academicClass.save();
  }

  async updateClass(instituteId: string, classId: string, data: any) {
    const updatedClass = await this.classModel.findOneAndUpdate(
      { _id: new Types.ObjectId(classId), instituteId: new Types.ObjectId(instituteId) },
      { $set: { name: data.name } },
      { new: true },
    ).populate('subjects');

    if (!updatedClass) {
      throw new NotFoundException('Class not found');
    }

    return updatedClass;
  }

  async deleteClass(instituteId: string, classId: string) {
    const targetClass = await this.classModel.findOne({
      _id: new Types.ObjectId(classId),
      instituteId: new Types.ObjectId(instituteId),
    });

    if (!targetClass) {
      throw new NotFoundException('Class not found');
    }

    await this.subjectModel.deleteMany({
      classId: new Types.ObjectId(classId),
      instituteId: new Types.ObjectId(instituteId),
    });

    await this.classModel.deleteOne({
      _id: new Types.ObjectId(classId),
      instituteId: new Types.ObjectId(instituteId),
    });

    return { message: 'Class deleted successfully' };
  }

  async getClasses(instituteId: string) {
    return this.classModel
      .find({ instituteId: new Types.ObjectId(instituteId) })
      .populate('subjects');
  }

  // Subject Methods
  async createSubject(instituteId: string, data: any) {
    if (!data.classId || !Types.ObjectId.isValid(data.classId)) {
      throw new BadRequestException('Valid classId is required');
    }

    // Check if class exists
    const targetClass = await this.classModel.findOne({
      _id: new Types.ObjectId(data.classId),
      instituteId: new Types.ObjectId(instituteId),
    });
    
    if (!targetClass) {
      throw new NotFoundException('The specified class does not exist');
    }

    try {
      const subject = new this.subjectModel({ 
        ...data, 
        instituteId: new Types.ObjectId(instituteId),
        classId: new Types.ObjectId(data.classId)
      });
      const savedSubject = await subject.save();
      
      // Add subject to class
      await this.classModel.findByIdAndUpdate(data.classId, {
        $addToSet: { subjects: savedSubject._id }
      });
      
      return savedSubject;
    } catch (err) {
      if (err.code === 11000) {
        throw new BadRequestException('A subject with this name already exists in this class');
      }
      throw err;
    }
  }

  async updateSubject(instituteId: string, subjectId: string, data: any) {
    const updatePayload: any = {};
    if (data.name !== undefined) updatePayload.name = data.name;

    const updatedSubject = await this.subjectModel.findOneAndUpdate(
      { _id: new Types.ObjectId(subjectId), instituteId: new Types.ObjectId(instituteId) },
      { $set: updatePayload },
      { new: true },
    );

    if (!updatedSubject) {
      throw new NotFoundException('Subject not found');
    }

    return updatedSubject;
  }

  async deleteSubject(instituteId: string, subjectId: string) {
    const targetSubject = await this.subjectModel.findOne({
      _id: new Types.ObjectId(subjectId),
      instituteId: new Types.ObjectId(instituteId),
    });

    if (!targetSubject) {
      throw new NotFoundException('Subject not found');
    }

    await this.subjectModel.deleteOne({
      _id: new Types.ObjectId(subjectId),
      instituteId: new Types.ObjectId(instituteId),
    });

    await this.classModel.findByIdAndUpdate(targetSubject.classId, {
      $pull: { subjects: targetSubject._id },
    });

    return { message: 'Subject deleted successfully' };
  }

  async getSubjectsByClass(instituteId: string, classId: string) {
    const targetClass = await this.classModel.findOne({
      _id: new Types.ObjectId(classId),
      instituteId: new Types.ObjectId(instituteId),
    });
    if (!targetClass) {
      throw new NotFoundException('Class not found');
    }
    return this.subjectModel.find({
      classId: new Types.ObjectId(classId),
      instituteId: new Types.ObjectId(instituteId),
    });
  }
}
