import { IsString, IsNotEmpty, IsOptional, IsEnum, IsEmail, IsMongoId } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateStudentDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  rollNumber?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  registrationNumber?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  phone: string;

  @ApiProperty({ required: false })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  fatherName?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  fatherPhone?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  motherName?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  motherPhone?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  instituteName?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  address?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  monthlyFees?: string;

  @ApiProperty()
  @IsMongoId()
  @IsNotEmpty()
  classId: string;

  @ApiProperty({ required: false })
  @IsMongoId()
  @IsOptional()
  academicSessionId?: string;

  @ApiProperty({ required: false, enum: ['Male', 'Female', 'Other'] })
  @IsEnum(['Male', 'Female', 'Other'])
  @IsOptional()
  gender?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  dateOfBirth?: Date;
}
