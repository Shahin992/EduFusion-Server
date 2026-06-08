import { IsString, IsNotEmpty, IsOptional, IsNumber, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class GenerateBulkFeesDto {
  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  classId?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  feeType: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  feeName?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  month?: string;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  amount: number;
}
