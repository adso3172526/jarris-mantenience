import { IsNotEmpty, IsString } from 'class-validator';

export class StartWorkOrderDto {
  @IsString()
  @IsNotEmpty()
  startedBy: string; // nombre del técnico/contratista que inicia
}
