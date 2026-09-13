import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateAgentDto {
  @IsUUID()
  @IsNotEmpty()
  projectId: string;

  @IsUUID()
  @IsOptional()
  organizationId?: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;
}
