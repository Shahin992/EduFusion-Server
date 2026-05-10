import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { LandingController } from './landing.controller';
import { LandingService } from './landing.service';
import { Lead, LeadSchema } from '../../schemas/lead.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Lead.name, schema: LeadSchema }]),
  ],
  controllers: [LandingController],
  providers: [LandingService],
})
export class LandingModule {}
