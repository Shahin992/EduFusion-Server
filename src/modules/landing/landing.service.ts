import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Lead } from '../../schemas/lead.schema';

@Injectable()
export class LandingService {
  constructor(@InjectModel(Lead.name) private leadModel: Model<Lead>) {}

  async createLead(data: any) {
    const newLead = new this.leadModel(data);
    await newLead.save();
    return {
      message: 'Thank you for your interest! Our team will contact you shortly.',
      status: 'success',
    };
  }
}
