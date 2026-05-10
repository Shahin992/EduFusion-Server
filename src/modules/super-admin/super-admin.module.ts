import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SuperAdminService } from './super-admin.service';
import { SuperAdminController } from './super-admin.controller';
import { Institute, InstituteSchema } from '../../schemas/institute.schema';
import { User, UserSchema } from '../../schemas/user.schema';
import { Lead, LeadSchema } from '../../schemas/lead.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Institute.name, schema: InstituteSchema },
      { name: User.name, schema: UserSchema },
      { name: Lead.name, schema: LeadSchema },
    ]),
  ],
  providers: [SuperAdminService],
  controllers: [SuperAdminController],
})
export class SuperAdminModule {}
