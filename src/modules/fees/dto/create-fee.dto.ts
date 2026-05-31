import { IsString, IsNotEmpty, IsNumber, IsOptional, IsEnum, IsDateString, IsMongoId } from 'class-validator';

export class CreateFeeDto {
  @IsMongoId()
  @IsNotEmpty()
  studentId: string;

  @IsNumber()
  @IsNotEmpty()
  amount: number;

  @IsString()
  @IsNotEmpty()
  @IsEnum(['Monthly', 'Admission', 'Exam', 'Transport', 'Other'])
  feeType: string;

  @IsString()
  @IsOptional()
  month?: string;

  @IsDateString()
  @IsNotEmpty()
  paymentDate: Date;

  @IsString()
  @IsOptional()
  note?: string;

  @IsString()
  @IsOptional()
  @IsEnum(['Paid', 'Partial', 'Pending'])
  status?: string;
}
