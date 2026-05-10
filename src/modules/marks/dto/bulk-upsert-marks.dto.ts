import { IsString, IsNumber, IsMongoId, IsEnum, IsOptional, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class MarkItemDto {
  @IsMongoId()
  studentId: string;

  @IsNumber()
  marksObtained: number;

  @IsEnum(['Present', 'Absent', 'Expelled'])
  status: string;

  @IsOptional()
  @IsString()
  comments?: string;
}

export class BulkUpsertMarksDto {
  @IsMongoId()
  examId: string;

  @IsMongoId()
  subjectId: string;

  @IsMongoId()
  classId: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MarkItemDto)
  marks: MarkItemDto[];
}

export class StudentMarkItemDto {
  @IsMongoId()
  subjectId: string;

  @IsNumber()
  marksObtained: number;

  @IsEnum(['Present', 'Absent', 'Expelled'])
  status: string;

  @IsOptional()
  @IsString()
  comments?: string;
}

export class StudentWiseUpsertMarksDto {
  @IsMongoId()
  examId: string;

  @IsMongoId()
  studentId: string;

  @IsMongoId()
  classId: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StudentMarkItemDto)
  marks: StudentMarkItemDto[];
}
