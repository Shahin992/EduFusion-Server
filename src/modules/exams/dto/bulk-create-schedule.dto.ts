import { IsString, IsNumber, IsMongoId, IsDateString, IsOptional, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class ScheduleItemDto {
  @IsMongoId()
  subjectId: string;

  @IsDateString()
  examDate: string;

  @IsString()
  startTime: string;

  @IsString()
  endTime: string;

  @IsNumber()
  totalMarks: number;

  @IsOptional()
  @IsString()
  roomNumber?: string;
}

export class BulkCreateScheduleDto {
  @IsMongoId()
  examId: string;

  @IsMongoId()
  classId: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ScheduleItemDto)
  schedules: ScheduleItemDto[];
}
