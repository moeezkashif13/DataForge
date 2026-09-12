import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { Transform } from 'class-transformer';
import {
  MigrationStatus,
  MigrationSourceType,
  MigrationTargetType,
} from '../../../models/migration.model';

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

  @IsEnum(MigrationStatus)
  @IsOptional()
  status?: MigrationStatus;

  @IsArray()
  @IsNotEmpty()
  mappings: any[];

  // Source Fields
  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.toLowerCase() : value,
  )
  @IsEnum(MigrationSourceType, {
    message: `source_type must be one of: ${Object.values(MigrationSourceType).join(', ')}`,
  })
  source_type?: MigrationSourceType;

  @IsString()
  @IsOptional()
  source_schema?: string;

  @IsString()
  @IsOptional()
  source_database?: string | null;

  @IsString()
  @IsOptional()
  source_table?: string | null;

  @IsString()
  @IsOptional()
  source_file_path?: string | null;

  // Target Fields
  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.toLowerCase() : value,
  )
  @IsEnum(MigrationTargetType, {
    message: `target_type must be one of: ${Object.values(MigrationTargetType).join(', ')}`,
  })
  target_type?: MigrationTargetType;

  @IsString()
  @IsOptional()
  target_schema?: string;

  @IsString()
  @IsOptional()
  target_database?: string;

  @IsString()
  @IsOptional()
  target_table?: string;
}


