import { Controller, Get, Post, Body, Request, UseGuards, Param, Delete } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { WahaService } from './waha.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';

@ApiTags('waha')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('waha')
export class WahaController {
  constructor(private readonly wahaService: WahaService) {}

  @Get('status')
  @ApiOperation({ summary: 'Get WhatsApp Connection Status' })
  getStatus(@Request() req) {
    return this.wahaService.getSessionStatus(req.user.instituteId);
  }

  @Post('start')
  @ApiOperation({ summary: 'Initialize WhatsApp session and get QR Code' })
  startSession(@Request() req) {
    return this.wahaService.startSession(req.user.instituteId);
  }

  @Post('disconnect')
  @ApiOperation({ summary: 'Disconnect current WhatsApp session' })
  disconnectSession(@Request() req) {
    return this.wahaService.disconnectSession(req.user.instituteId);
  }

  @Get('campaigns')
  @ApiOperation({ summary: 'Get all WhatsApp campaigns' })
  getCampaigns(@Request() req) {
    return this.wahaService.getCampaigns(req.user.instituteId);
  }

  @Post('campaigns')
  @ApiOperation({ summary: 'Create a new bulk message campaign' })
  createCampaign(@Request() req, @Body() payload: any) {
    return this.wahaService.createCampaign(req.user.instituteId, payload, req.user.userId);
  }
}
