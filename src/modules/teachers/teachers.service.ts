import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Teacher } from '../../schemas/teacher.schema';
import { Subject } from '../../schemas/subject.schema';
import { CreateTeacherDto } from './dto/create-teacher.dto';
import { UpdateTeacherDto } from './dto/update-teacher.dto';

@Injectable()
export class TeachersService {
  constructor(
    @InjectModel(Teacher.name) private teacherModel: Model<Teacher>,
    @InjectModel(Subject.name) private subjectModel: Model<Subject>,
  ) {}

  private async validateSubjectOwnership(subjectIds: string[] = [], instituteId: string) {
    if (!subjectIds.length) {
      return [];
    }

    const uniqueIds = Array.from(new Set(subjectIds));
    const objectIds = uniqueIds.map((id) => new Types.ObjectId(id));
    const ownedSubjectCount = await this.subjectModel.countDocuments({
      _id: { $in: objectIds },
      instituteId: new Types.ObjectId(instituteId),
    });

    if (ownedSubjectCount !== uniqueIds.length) {
      throw new NotFoundException('One or more selected subjects were not found for this institute');
    }

    return objectIds;
  }

  async create(createTeacherDto: CreateTeacherDto, instituteId: string): Promise<Teacher> {
    const { email } = createTeacherDto;
    const allocatedSubjects = await this.validateSubjectOwnership(
      createTeacherDto.allocatedSubjects ?? [],
      instituteId,
    );

    const existingEmail = await this.teacherModel.findOne({
      instituteId: new Types.ObjectId(instituteId),
      email,
    });

    if (existingEmail) {
      throw new ConflictException(`Teacher with email ${email} already exists`);
    }

    const createdTeacher = new this.teacherModel({
      ...createTeacherDto,
      allocatedSubjects,
      instituteId: new Types.ObjectId(instituteId),
    });

    return createdTeacher.save();
  }

  async findAll(instituteId: string, query: { search?: string; page?: number; limit?: number }) {
    const { search, page = 1, limit = 10 } = query;
    const filter: any = { instituteId: new Types.ObjectId(instituteId) };

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { designation: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (page - 1) * limit;
    const [teachers, total] = await Promise.all([
      this.teacherModel
        .find(filter)
        .populate('allocatedSubjects')
        .sort({ name: 1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.teacherModel.countDocuments(filter),
    ]);

    return {
      teachers,
      total,
      page,
      lastPage: Math.ceil(total / limit),
    };
  }

  async findOne(id: string, instituteId: string): Promise<Teacher> {
    const teacher = await this.teacherModel
      .findOne({ _id: new Types.ObjectId(id), instituteId: new Types.ObjectId(instituteId) })
      .populate('allocatedSubjects')
      .exec();

    if (!teacher) {
      throw new NotFoundException('Teacher not found');
    }
    return teacher;
  }

  async update(id: string, updateTeacherDto: UpdateTeacherDto, instituteId: string): Promise<Teacher> {
    const updatePayload: any = { ...updateTeacherDto };

    if (updateTeacherDto.allocatedSubjects) {
      updatePayload.allocatedSubjects = await this.validateSubjectOwnership(
        updateTeacherDto.allocatedSubjects ?? [],
        instituteId,
      );
    }

    const teacher = await this.teacherModel.findOneAndUpdate(
      { _id: new Types.ObjectId(id), instituteId: new Types.ObjectId(instituteId) },
      { $set: updatePayload },
      { new: true },
    ).populate('allocatedSubjects');

    if (!teacher) {
      throw new NotFoundException('Teacher not found');
    }
    return teacher;
  }

  async remove(id: string, instituteId: string) {
    const result = await this.teacherModel.deleteOne({
      _id: new Types.ObjectId(id),
      instituteId: new Types.ObjectId(instituteId),
    });

    if (result.deletedCount === 0) {
      throw new NotFoundException('Teacher not found');
    }
    return { message: 'Teacher deleted successfully' };
  }

  async allocateSubjects(id: string, subjectIds: string[], instituteId: string): Promise<Teacher> {
    const allocatedSubjects = await this.validateSubjectOwnership(subjectIds, instituteId);

    const teacher = await this.teacherModel.findOneAndUpdate(
      { _id: new Types.ObjectId(id), instituteId: new Types.ObjectId(instituteId) },
      { $set: { allocatedSubjects } },
      { new: true },
    ).populate('allocatedSubjects');

    if (!teacher) {
      throw new NotFoundException('Teacher not found');
    }
    return teacher;
  }
}
