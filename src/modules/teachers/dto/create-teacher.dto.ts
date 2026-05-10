import { IsString, IsNotEmpty, IsEnum, IsEmail, IsOptional, IsDateString, IsArray, IsMongoId } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateTeacherDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  designation: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  department?: string;

  @ApiProperty({ enum: ['Male', 'Female', 'Other'] })
  @IsEnum(['Male', 'Female', 'Other'])
  gender: string;

  @ApiProperty({ required: false })
  @IsDateString()
  @IsOptional()
  dateOfBirth?: string;

  @ApiProperty()
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  phone: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  address?: string;

  @ApiProperty({ required: false })
  @IsDateString()
  @IsOptional()
  joiningDate?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  qualification?: string;

  @ApiProperty({ type: [String], required: false })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  specializations?: string[];

  @ApiProperty({ type: [String], required: false })
  @IsArray()
  @IsMongoId({ each: true })
  @IsOptional()
  allocatedSubjects?: string[];

  @ApiProperty({ required: false, enum: ['Active', 'Inactive', 'On Leave', 'Resigned'] })
  @IsEnum(['Active', 'Inactive', 'On Leave', 'Resigned'])
  @IsOptional()
  status?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  photoUrl?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  monthlySalary?: string;
}
