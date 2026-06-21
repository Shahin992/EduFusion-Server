import { Controller, Get, Post, Put, Body, Param, UseGuards, Req, SetMetadata } from '@nestjs/common';
import { BillingService } from './billing.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';

const Roles = (...roles: string[]) => SetMetadata('roles', roles);

@Controller('billing')
@UseGuards(JwtAuthGuard, RolesGuard)
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  // --- Super Admin Endpoints ---

  @Post('plans')
  @Roles('super_admin')
  createPlan(@Body() data: any) {
    return this.billingService.createPlan(data);
  }

  @Put('plans/:id')
  @Roles('super_admin')
  updatePlan(@Param('id') id: string, @Body() data: any) {
    return this.billingService.updatePlan(id, data);
  }

  @Get('verifications')
  @Roles('super_admin')
  getVerifications() {
    return this.billingService.getPendingVerifications();
  }

  @Post('verifications/:id')
  @Roles('super_admin')
  verifyTransaction(@Param('id') id: string, @Body('approve') approve: boolean) {
    return this.billingService.verifyTransaction(id, approve);
  }

  // --- Institute Admin Endpoints ---

  @Get('plans')
  // Anyone can see active plans
  getActivePlans() {
    return this.billingService.getAllPlans(false);
  }

  @Get('super-admin/plans')
  @Roles('super_admin')
  getAllPlans() {
    return this.billingService.getAllPlans(true);
  }

  @Get('current')
  getCurrentSubscription(@Req() req) {
    const instituteId = req.user.instituteId;
    return this.billingService.getCurrentSubscription(instituteId);
  }

  @Post('pay')
  submitPayment(@Req() req, @Body() data: any) {
    const instituteId = req.user.instituteId;
    return this.billingService.submitPayment(instituteId, data);
  }

  @Get('transactions')
  getMyTransactions(@Req() req) {
    const instituteId = req.user.instituteId;
    return this.billingService.getInstituteTransactions(instituteId);
  }
}
