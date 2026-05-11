import { 
  Controller, 
  Get, 
  Put, 
  Body, 
  Param, 
  UseGuards, 
  Request,
  UnauthorizedException,
  Post,
  UseInterceptors,
  UploadedFile
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { InstitutesService } from './institutes.service';
import { uploadPhotoBuffer } from '../../config/cloudinary';
import { UpdateInstituteDto } from './dto/update-institute.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { SetMetadata } from '@nestjs/common';

import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

const Roles = (...roles: string[]) => SetMetadata('roles', roles);

@ApiTags('institutes')
@ApiBearerAuth()
@Controller('institutes')
@UseGuards(JwtAuthGuard, RolesGuard)
export class InstitutesController {
  constructor(private readonly institutesService: InstitutesService) {}

  @Get('my-institute')
  @Roles('admin', 'teacher', 'student')
  async getMyInstitute(@Request() req: any) {
    if (!req.user.instituteId) {
      throw new UnauthorizedException('No institute context found');
    }
    const data = await this.institutesService.findOne(req.user.instituteId);
    return {
      success: true,
      data
    };
  }

  @Put('config')
  @Roles('admin')
  async updateConfig(@Request() req: any, @Body() updateDto: UpdateInstituteDto) {
    if (!req.user.instituteId) {
      throw new UnauthorizedException('No institute context found');
    }
    const data = await this.institutesService.update(req.user.instituteId, updateDto);
    return {
      success: true,
      data
    };
  }

  @Post('upload-logo')
  @Roles('admin')
  @UseInterceptors(FileInterceptor('file'))
  async uploadLogo(@UploadedFile() file: any) {
    if (!file) {
      throw new Error('No file uploaded');
    }
    const result: any = await uploadPhotoBuffer(file.buffer, {
      folder: 'institutes/logos',
    });
    return {
      success: true,
      data: {
        url: result.url
      }
    };
  }

  @Post('onboard-complete')
  @Roles('admin')
  async onboardComplete(@Request() req: any, @Body() data: any) {
    if (!req.user.instituteId) {
      throw new UnauthorizedException('No institute context found');
    }
    const institute = await this.institutesService.completeOnboarding(req.user.instituteId, data);
    return {
      success: true,
      data: institute
    };
  }
}
