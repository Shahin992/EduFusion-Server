import { IsOptional, IsString, IsObject, IsBoolean } from 'class-validator';

export class UpdateInstituteDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  logoUrl?: string;

  @IsOptional()
  @IsObject()
  branding?: any;

  @IsOptional()
  gradingRules?: any[];

  @IsOptional()
  @IsObject()
  config?: any;

  @IsOptional()
  @IsString()
  subscriptionTier?: string;

  @IsOptional()
  @IsBoolean()
  isOnboarded?: boolean;

  @IsOptional()
  onboardingStep?: number;
}
