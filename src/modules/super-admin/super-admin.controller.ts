import { Controller, Get, Patch, Body, Param, UseGuards, SetMetadata } from '@nestjs/common';
import { SuperAdminService } from './super-admin.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';

const Roles = (...roles: string[]) => SetMetadata('roles', roles);

@Controller('super-admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('super_admin')
export class SuperAdminController {
  constructor(private readonly superAdminService: SuperAdminService) {}

  @Get('stats')
  getStats() {
    return this.superAdminService.getPlatformStats();
  }

  @Get('institutes')
  getInstitutes() {
    return this.superAdminService.getAllInstitutes();
  }

  @Patch('institutes/:id/subscription')
  updateSubscription(
    @Param('id') id: string,
    @Body() data: { tier?: string; trialExpiresAt?: Date; isActive?: boolean; aiProvider?: string }
  ) {
    return this.superAdminService.updateSubscription(id, data);
  }

  @Get('leads')
  getLeads() {
    return this.superAdminService.getAllLeads();
  }

  @Patch('leads/:id/status')
  updateLeadStatus(
    @Param('id') id: string,
    @Body() data: { status: string; notes?: string }
  ) {
    return this.superAdminService.updateLeadStatus(id, data.status, data.notes);
  }
}
