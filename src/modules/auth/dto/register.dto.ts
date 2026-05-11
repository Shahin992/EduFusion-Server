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

  @ApiProperty({ 
    required: false, 
    example: 'Greenwood High', 
    description: 'Name of the new institute to create (Required for Admins)' 
  })
  @IsOptional()
  @IsString()
  instituteName?: string;

  @ApiProperty({ 
    required: false, 
    example: '65e6f8901234567890abcdef', 
    description: 'ID of an existing institute to join (Required for Teachers/Students)' 
  })
  @IsOptional()
  @IsString()
  instituteId?: string;
}
