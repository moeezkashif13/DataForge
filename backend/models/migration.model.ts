import {
  Table,
  Column,
  Model,
  DataType,
  ForeignKey,
  BelongsTo,
  Index,
  BeforeValidate,
} from 'sequelize-typescript';
import { Project } from './project.model';
import { User } from './user.model';

export enum MigrationStatus {
  RUNNING = 'Running',
  COMPLETED = 'Completed',
  PAUSED = 'Paused',
  FAILED = 'Failed',
  READY = 'Ready',
  QUEUED = 'Queued',
}

export enum MigrationSourceType {
  MYSQL = 'mysql',
  POSTGRESQL = 'postgresql',
  CSV = 'csv',
  JSON = 'json',
  S3 = 's3',
}

export enum MigrationTargetType {
  MYSQL = 'mysql',
  POSTGRESQL = 'postgresql',
}

@Table({
  tableName: 'migrations',
  timestamps: true,
  validate: {
    dynamicValidation(this: Migration) {
      Migration.validateSourceFields(this);
      Migration.validateTargetFields(this);
      Migration.validateMappings(this);
    },
  },
})
export class Migration extends Model<Migration> {
  @Column({
    type: DataType.UUID,
    defaultValue: DataType.UUIDV4,
    primaryKey: true,
  })
  declare id: string;

  @Column({
    type: DataType.STRING(255),
    allowNull: false,
  })
  declare name: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  declare description: string;

  @Column({
    type: DataType.ENUM(...Object.values(MigrationSourceType)),
    allowNull: false,
    field: 'source_type',
  })
  declare source_type: MigrationSourceType;

  @Column({
    type: DataType.STRING(255),
    allowNull: false,
    defaultValue: 'public',
    field: 'source_schema',
  })
  declare source_schema: string;

  @Column({
    type: DataType.STRING(255),
    allowNull: true,
    field: 'source_database',
  })
  declare source_database: string | null;

  @Column({
    type: DataType.STRING(255),
    allowNull: true,
    field: 'source_table',
  })
  declare source_table: string | null;

  @Column({
    type: DataType.STRING(1000),
    allowNull: true,
    field: 'source_file_path',
  })
  declare source_file_path: string | null;

  @Column({
    type: DataType.ENUM(...Object.values(MigrationTargetType)),
    allowNull: false,
    field: 'target_type',
  })
  declare target_type: MigrationTargetType;

  @Column({
    type: DataType.STRING(255),
    allowNull: false,
    defaultValue: 'public',
    field: 'target_schema',
  })
  declare target_schema: string;

  @Column({
    type: DataType.STRING(255),
    allowNull: false,
    field: 'target_database',
  })
  declare target_database: string;

  @Column({
    type: DataType.STRING(255),
    allowNull: false,
    field: 'target_table',
  })
  declare target_table: string;

  @Column({
    type: DataType.JSON,
    allowNull: false,
    defaultValue: [],
    field: 'mappings',
  })
  declare mappings: any[];

  @Column({
    type: DataType.ENUM(...Object.values(MigrationStatus)),
    allowNull: false,
    defaultValue: MigrationStatus.READY,
  })
  declare status: MigrationStatus;

  @ForeignKey(() => Project)
  @Index
  @Column({
    type: DataType.UUID,
    allowNull: false,
    field: 'project_id',
  })
  declare projectId: string;

  @ForeignKey(() => User)
  @Index
  @Column({
    type: DataType.UUID,
    allowNull: true,
    field: 'created_by',
  })
  declare createdBy: string | null;

  @BelongsTo(() => Project, {
    foreignKey: 'projectId',
    onDelete: 'CASCADE',
  })
  declare project: Project;

  @BelongsTo(() => User, {
    foreignKey: 'createdBy',
    onDelete: 'SET NULL',
  })
  declare creator: User;

  @BeforeValidate
  static validateAllFields(instance: Migration) {
    Migration.validateSourceFields(instance);
    Migration.validateTargetFields(instance);
    Migration.validateMappings(instance);
  }

  static validateSourceFields(instance: Migration) {
    if (!instance.source_type) {
      throw new Error('source_type is required and cannot be null');
    }

    const validSourceTypes = Object.values(MigrationSourceType);
    if (!validSourceTypes.includes(instance.source_type)) {
      throw new Error(
        `source_type must be one of: ${validSourceTypes.join(', ')}`,
      );
    }

    if (instance.source_schema === null) {
      throw new Error('source_schema cannot be null');
    }
    if (!instance.source_schema) {
      instance.source_schema = 'public';
    }

    if (
      instance.source_type === MigrationSourceType.MYSQL ||
      instance.source_type === MigrationSourceType.POSTGRESQL
    ) {
      if (!instance.source_database || !instance.source_database.trim()) {
        throw new Error(
          `source_database cannot be null or empty when source_type is "${instance.source_type}"`,
        );
      }
      if (!instance.source_table || !instance.source_table.trim()) {
        throw new Error(
          `source_table cannot be null or empty when source_type is "${instance.source_type}"`,
        );
      }
    } else if (
      instance.source_type === MigrationSourceType.CSV ||
      instance.source_type === MigrationSourceType.JSON ||
      instance.source_type === MigrationSourceType.S3
    ) {
      if (!instance.source_file_path || !instance.source_file_path.trim()) {
        throw new Error(
          `source_file_path cannot be null or empty when source_type is "${instance.source_type}"`,
        );
      }
    }
  }

  static validateTargetFields(instance: Migration) {
    if (!instance.target_type) {
      throw new Error('target_type is required and cannot be null');
    }

    const validTargetTypes = Object.values(MigrationTargetType);
    if (!validTargetTypes.includes(instance.target_type)) {
      throw new Error(
        `target_type must be one of: ${validTargetTypes.join(', ')}`,
      );
    }

    if (instance.target_schema === null) {
      throw new Error('target_schema cannot be null');
    }
    if (!instance.target_schema) {
      instance.target_schema = 'public';
    }

    if (!instance.target_database || !instance.target_database.trim()) {
      throw new Error('target_database is required and cannot be null');
    }

    if (!instance.target_table || !instance.target_table.trim()) {
      throw new Error('target_table is required and cannot be null');
    }
  }

  static validateMappings(instance: Migration) {
    if (instance.mappings === null || instance.mappings === undefined) {
      throw new Error('mappings is required and cannot be null');
    }
  }
}

