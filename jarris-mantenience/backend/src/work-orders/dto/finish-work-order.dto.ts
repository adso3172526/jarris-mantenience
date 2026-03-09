import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class FinishWorkOrderDto {
  @IsString()
  @IsNotEmpty()
  workDoneDescription: string;

  @IsOptional()
  @IsNumber()
  cost?: number;

  @IsString()
  @IsNotEmpty()
  finishedBy: string; // nombre del técnico/contratista
}
