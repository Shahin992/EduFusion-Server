import { IsString, IsNotEmpty, IsNumber, IsOptional, IsEnum, Min, MaxLength } from 'class-validator';

export class CreateExpenseDto {
  @IsString()
  @IsNotEmpty({ message: 'Title is required' })
  @MaxLength(100, { message: 'Title cannot exceed 100 characters' })
  title: string;

  @IsNumber()
  @Min(1, { message: 'Amount must be greater than 0' })
  @IsNotEmpty({ message: 'Amount is required' })
  amount: number;

  @IsString()
  @IsNotEmpty({ message: 'Category is required' })
  @MaxLength(50, { message: 'Category cannot exceed 50 characters' })
  category: string;

  @IsString()
  @IsOptional()
  @MaxLength(500, { message: 'Description cannot exceed 500 characters' })
  description?: string;
}
