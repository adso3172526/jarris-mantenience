import { IsNotEmpty, IsString } from 'class-validator';

export class RejectWorkOrderDto {
  @IsNotEmpty()
  @IsString()
  rejectionReason: string;

  @IsNotEmpty()
  @IsString()
  rejectedBy: string; // Email del jefe
}
