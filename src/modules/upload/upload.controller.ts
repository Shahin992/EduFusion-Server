import { 
  Controller, 
  Post, 
  UseInterceptors, 
  UploadedFile, 
  UseGuards, 
  BadRequestException,
  Body 
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { uploadPhotoBuffer } from '../../config/cloudinary';

@Controller('upload')
@UseGuards(JwtAuthGuard)
export class UploadController {
  @Post('image')
  @UseInterceptors(FileInterceptor('file'))
  async uploadImage(@UploadedFile() file: any) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    try {
      const result: any = await uploadPhotoBuffer(file.buffer, {
        folder: 'edufusion/uploads',
      });
      return {
        success: true,
        data: {
          url: result.url
        }
      };
    } catch (error) {
      console.error('Cloudinary Upload Error:', error);
      throw new BadRequestException('Failed to upload image to Cloudinary');
    }
  }
}
