import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { MigrationStatus } from '../../../models/migration.model';

export class CreateMigrationDto {
  @IsUUID()
  @IsNotEmpty()
  projectId: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsNotEmpty()
  source_path: string;

  @IsString()
  @IsNotEmpty()
  target_path: string;

  // @IsEnum(MigrationStatus, {
  //   message: `status must be one of the following values: ${Object.values(MigrationStatus).join(', ')}`,
  // })
  // @IsOptional()
  // status?: MigrationStatus;
}
