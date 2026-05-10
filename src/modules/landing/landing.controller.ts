import { Controller, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { LandingService } from './landing.service';
import { IsEmail, IsNotEmpty, IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

class CreateLeadDto {
  @ApiProperty({ example: 'John Doe' })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({ example: 'john@school.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'Greenwood High', required: false })
  @IsOptional()
  @IsString()
  instituteName?: string;

  @ApiProperty({ example: 'I am interested in a demo.' })
  @IsNotEmpty()
  @IsString()
  message: string;
}

@ApiTags('Landing')
@Controller('landing')
export class LandingController {
  constructor(private readonly landingService: LandingService) {}

  @Post('contact')
  @ApiOperation({ summary: 'Submit contact form (Lead generation)' })
  @ApiResponse({ status: 201, description: 'Lead successfully submitted.' })
  async createLead(@Body() createLeadDto: CreateLeadDto) {
    return this.landingService.createLead(createLeadDto);
  }
}
