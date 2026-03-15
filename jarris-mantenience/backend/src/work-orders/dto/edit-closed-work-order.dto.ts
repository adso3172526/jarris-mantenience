import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class EditClosedWorkOrderDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  requestDescription?: string;

  @IsOptional()
  @IsString()
  workDoneDescription?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  cost?: number;
}
