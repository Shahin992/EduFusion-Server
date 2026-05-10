import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MinLength, IsEnum, IsOptional } from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'user@example.com', description: 'The email of the user' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'password123', minLength: 6 })
  @IsNotEmpty()
  @IsString()
  @MinLength(6)
  password: string;

  @ApiProperty({ example: 'John Doe' })
  @IsNotEmpty()
  @IsString()
  @MinLength(3)
  name: string;

  @ApiProperty({ enum: ['admin', 'teacher', 'student'], example: 'student' })
  @IsNotEmpty()
  @IsEnum(['admin', 'teacher', 'student'])
  role: string;

  @ApiProperty({ required: false, example: 'Greenwood High' })
  @IsOptional()
  @IsString()
  instituteName?: string;

  @ApiProperty({ required: false, example: 'INST123' })
  @IsOptional()
  @IsString()
  instituteId?: string;
}
