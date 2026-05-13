import { IsString, IsEnum, IsDateString, IsMongoId, IsOptional, IsArray, ValidateNested, IsNumber, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';

class ExamSubjectDto {
  @IsMongoId()
  subjectId: string;

  @IsNumber()
  totalMarks: number;
}

export class CreateExamDto {
  @IsString()
  name: string;

  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

  @IsOptional()
  @IsMongoId()
  classId?: string;

  @IsOptional()
  @IsBoolean()
  resultPublished?: boolean;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExamSubjectDto)
  subjects?: ExamSubjectDto[];
}
