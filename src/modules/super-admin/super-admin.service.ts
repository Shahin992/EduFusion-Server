import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Institute } from '../../schemas/institute.schema';
import { User } from '../../schemas/user.schema';
import { Lead } from '../../schemas/lead.schema';

@Injectable()
export class SuperAdminService {
  constructor(
    @InjectModel(Institute.name) private instituteModel: Model<Institute>,
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(Lead.name) private leadModel: Model<Lead>,
  ) {}

  async getPlatformStats() {
    const [totalInstitutes, totalUsers, totalLeads, trialInstitutes, activeInstitutes] = await Promise.all([
      this.instituteModel.countDocuments(),
      this.userModel.countDocuments(),
      this.leadModel.countDocuments(),
      this.instituteModel.countDocuments({ subscriptionTier: 'trial' }),
      this.instituteModel.countDocuments({ subscriptionTier: 'active' }),
    ]);

    // Monthly growth (new institutes in last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const newInstitutes = await this.instituteModel.countDocuments({ createdAt: { $gte: thirtyDaysAgo } });

    return {
      totalInstitutes,
      totalUsers,
      totalLeads,
      trialInstitutes,
      activeInstitutes,
      newInstitutesLast30Days: newInstitutes,
    };
  }

  async getAllInstitutes() {
    return this.instituteModel.find().sort({ createdAt: -1 });
  }

  async updateSubscription(id: string, data: { tier?: string; trialExpiresAt?: Date; isActive?: boolean }) {
    const institute = await this.instituteModel.findByIdAndUpdate(
      id,
      { $set: data },
      { new: true }
    );
    if (!institute) {
      throw new NotFoundException('Institute not found');
    }
    return institute;
  }

  async getAllLeads() {
    return this.leadModel.find().sort({ createdAt: -1 });
  }

  async updateLeadStatus(id: string, status: string, notes?: string) {
    const lead = await this.leadModel.findByIdAndUpdate(
      id,
      { $set: { status, notes } },
      { new: true }
    );
    if (!lead) {
      throw new NotFoundException('Lead not found');
    }
    return lead;
  }
}
