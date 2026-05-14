import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Institute } from '../../schemas/institute.schema';
import { AcademicSession } from '../../schemas/academic-session.schema';
import { AcademicClass } from '../../schemas/academic-class.schema';
import { Subject } from '../../schemas/subject.schema';
import { UpdateInstituteDto } from './dto/update-institute.dto';
import { Types } from 'mongoose';

@Injectable()
export class InstitutesService {
  private readonly logger = new Logger(InstitutesService.name);

  constructor(
    @InjectModel(Institute.name) private instituteModel: Model<Institute>,
    @InjectModel(AcademicSession.name) private sessionModel: Model<AcademicSession>,
    @InjectModel(AcademicClass.name) private classModel: Model<AcademicClass>,
    @InjectModel(Subject.name) private subjectModel: Model<Subject>,
  ) {}

  async findOne(id: string): Promise<Institute> {
    const institute = await this.instituteModel.findById(id);
    if (!institute) {
      throw new NotFoundException('Institute not found');
    }
    return institute;
  }

  async update(id: string, updateDto: UpdateInstituteDto): Promise<Institute> {
    const updated = await this.instituteModel.findByIdAndUpdate(
      id,
      { $set: { ...updateDto } },
      { new: true },
    );
    if (!updated) {
      throw new NotFoundException('Institute not found');
    }
    return updated;
  }

  async setConfig(id: string, config: any): Promise<Institute> {
    const updated = await this.instituteModel.findByIdAndUpdate(
      id,
      { $set: { config } },
      { new: true },
    );
    return updated;
  }

  async completeOnboarding(id: string, data: any): Promise<Institute> {
    const { branding, gradingRules, session, classes } = data;
    const instId = new Types.ObjectId(id);
    const normalizedClasses = Array.isArray(classes)
      ? classes
          .map((clsData) => ({
            name: clsData.name?.trim(),
            subjects: Array.isArray(clsData.subjects)
              ? clsData.subjects.filter((subject) => subject?.trim())
              : [],
          }))
          .filter((clsData) => clsData.name)
      : [];

    // 2. Clear and recreate Session
    if (session) {
      await this.sessionModel.deleteMany({ instituteId: instId });
      const newSession = new this.sessionModel({
        ...session,
        instituteId: instId,
        isActive: true
      });
      await newSession.save();
    }

    // 3. Robust Class and Subject Creation
    await this.classModel.deleteMany({ instituteId: instId });
    await this.subjectModel.deleteMany({ instituteId: instId });

    if (normalizedClasses.length > 0) {
      this.logger.log(`Starting class creation for institute ${id}. Count: ${normalizedClasses.length}`);
      
      for (const clsData of normalizedClasses) {
        this.logger.log(`Creating class ${clsData.name}`);
        const academicClass = new this.classModel({
          name: clsData.name,
          instituteId: instId,
          subjects: []
        });
        const savedClass = await academicClass.save();

        if (clsData.subjects && clsData.subjects.length > 0) {
          const subjectsToCreate = clsData.subjects.map(subName => ({
            name: subName,
            code: subName.substring(0, 3).toUpperCase() + Math.floor(Math.random() * 900 + 100),
            classId: savedClass._id,
            instituteId: instId
          }));
          
          const savedSubjects = await this.subjectModel.insertMany(subjectsToCreate);
          
          // Link subjects back to class
          await this.classModel.findByIdAndUpdate(savedClass._id, {
            $set: { subjects: savedSubjects.map(s => s._id) }
          });
          this.logger.log(`Created ${savedSubjects.length} subjects for class ${clsData.name}`);
        }
      }
    }

    this.logger.log(`Finished onboarding data creation for institute ${id}`);

    // 4. Mark onboarding complete only after all dependent data is created.
    const institute = await this.instituteModel.findByIdAndUpdate(
      id,
      {
        $set: {
          name: branding?.name || '',
          logoUrl: branding?.logoUrl || '',
          branding: {
            address: branding?.address || '',
            phone: branding?.phone || '',
            email: branding?.email || '',
            principalName: branding?.principalName || '',
            principalSignatureUrl: branding?.principalSignatureUrl || '',
          },
          gradingRules,
          isOnboarded: true,
          onboardingStep: 3,
        },
        $unset: {
          'config.draftSession': 1,
          'config.draftClasses': 1,
        },
      },
      { new: true }
    );

    return institute;
  }
}

