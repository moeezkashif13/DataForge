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
  ACTIVE = 'active',
  PAUSED = 'paused',
}

export enum MigrationSourceType {
  MYSQL = 'mysql',
  POSTGRESQL = 'postgresql',
  CSV = 'csv',
  JSON = 'json',
  S3 = 's3',
}

export { MigrationSourceType as SourceType };

export enum MigrationTargetType {
  MYSQL = 'mysql',
  POSTGRESQL = 'postgresql',
}

export { MigrationTargetType as TargetType };

@Table({
  tableName: 'migrations',
  timestamps: true,
  validate: {
    dynamicValidation(this: Migration) {
      Migration.validateSourceFields(this);
      Migration.validateTargetFields(this);
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

  get sourceType(): MigrationSourceType {
    return this.getDataValue('source_type' as any);
  }
  set sourceType(value: MigrationSourceType) {
    this.setDataValue('source_type' as any, value);
  }

  @Column({
    type: DataType.STRING(255),
    allowNull: false,
    defaultValue: 'public',
    field: 'source_schema',
  })
  declare source_schema: string;

  get sourceSchema(): string {
    return this.getDataValue('source_schema' as any);
  }
  set sourceSchema(value: string) {
    this.setDataValue('source_schema' as any, value);
  }

  @Column({
    type: DataType.STRING(255),
    allowNull: true,
    field: 'source_database',
  })
  declare source_database: string | null;

  get sourceDatabase(): string | null {
    return this.getDataValue('source_database' as any);
  }
  set sourceDatabase(value: string | null) {
    this.setDataValue('source_database' as any, value);
  }

  @Column({
    type: DataType.STRING(255),
    allowNull: true,
    field: 'source_table',
  })
  declare source_table: string | null;

  get sourceTable(): string | null {
    return this.getDataValue('source_table' as any);
  }
  set sourceTable(value: string | null) {
    this.setDataValue('source_table' as any, value);
  }

  @Column({
    type: DataType.STRING(1000),
    allowNull: true,
    field: 'source_file_path',
  })
  declare source_file_path: string | null;

  get sourceFilePath(): string | null {
    return this.getDataValue('source_file_path' as any);
  }
  set sourceFilePath(value: string | null) {
    this.setDataValue('source_file_path' as any, value);
  }

  @Column({
    type: DataType.ENUM(...Object.values(MigrationTargetType)),
    allowNull: false,
    field: 'target_type',
  })
  declare target_type: MigrationTargetType;

  get targetType(): MigrationTargetType {
    return this.getDataValue('target_type' as any);
  }
  set targetType(value: MigrationTargetType) {
    this.setDataValue('target_type' as any, value);
  }

  get taget_type(): MigrationTargetType {
    return this.target_type;
  }
  set taget_type(value: MigrationTargetType) {
    this.target_type = value;
  }

  @Column({
    type: DataType.STRING(255),
    allowNull: false,
    defaultValue: 'public',
    field: 'target_schema',
  })
  declare target_schema: string;

  get targetSchema(): string {
    return this.getDataValue('target_schema' as any);
  }
  set targetSchema(value: string) {
    this.setDataValue('target_schema' as any, value);
  }

  @Column({
    type: DataType.STRING(255),
    allowNull: false,
    field: 'target_database',
  })
  declare target_database: string;

  get targetDatabase(): string {
    return this.getDataValue('target_database' as any);
  }
  set targetDatabase(value: string) {
    this.setDataValue('target_database' as any, value);
  }

  @Column({
    type: DataType.STRING(255),
    allowNull: false,
    field: 'target_table',
  })
  declare target_table: string;

  get targetTable(): string {
    return this.getDataValue('target_table' as any);
  }
  set targetTable(value: string) {
    this.setDataValue('target_table' as any, value);
  }

  @Column({
    type: DataType.ENUM(...Object.values(MigrationStatus)),
    allowNull: false,
    defaultValue: MigrationStatus.ACTIVE,
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
  }

  static validateSourceFields(instance: Migration) {
    const getVal = (snake: string, camel: string) => {
      const v =
        (instance as any)[snake] !== undefined
          ? (instance as any)[snake]
          : (instance as any)[camel];
      if (v !== undefined) return v;
      if (typeof instance.getDataValue === 'function') {
        const valFromData = instance.getDataValue(snake as any);
        if (valFromData !== undefined) return valFromData;
        return instance.getDataValue(camel as any);
      }
      return undefined;
    };

    // 1. Validate source_type (cannot be null, must be in enum)
    const rawSourceType = getVal('source_type', 'sourceType');

    if (!rawSourceType) {
      throw new Error('source_type is required and cannot be null');
    }

    const validSourceTypes = Object.values(MigrationSourceType);
    if (!validSourceTypes.includes(rawSourceType)) {
      throw new Error(
        `source_type must be one of: ${validSourceTypes.join(', ')}`,
      );
    }

    // Sync to model instance attributes if needed
    if (!instance.source_type && rawSourceType) {
      instance.source_type = rawSourceType;
    }

    // 2. Validate source_schema (default 'public', never null)
    const sourceSchema = getVal('source_schema', 'sourceSchema');
    if (sourceSchema === null) {
      throw new Error('source_schema cannot be null');
    }
    if (sourceSchema === undefined || sourceSchema === '') {
      instance.source_schema = 'public';
    }

    // 3 & 4. Dynamic null checks for source_database, source_table, source_file_path
    const sourceDatabase = getVal('source_database', 'sourceDatabase');
    const sourceTable = getVal('source_table', 'sourceTable');
    const sourceFilePath = getVal('source_file_path', 'sourceFilePath');

    if (
      rawSourceType === MigrationSourceType.MYSQL ||
      rawSourceType === MigrationSourceType.POSTGRESQL
    ) {
      if (
        sourceDatabase === null ||
        sourceDatabase === undefined ||
        (typeof sourceDatabase === 'string' && sourceDatabase.trim() === '')
      ) {
        throw new Error(
          `source_database cannot be null or empty when source_type is "${rawSourceType}"`,
        );
      }

      if (
        sourceTable === null ||
        sourceTable === undefined ||
        (typeof sourceTable === 'string' && sourceTable.trim() === '')
      ) {
        throw new Error(
          `source_table cannot be null or empty when source_type is "${rawSourceType}"`,
        );
      }
    } else if (
      rawSourceType === MigrationSourceType.CSV ||
      rawSourceType === MigrationSourceType.JSON ||
      rawSourceType === MigrationSourceType.S3
    ) {
      if (
        sourceFilePath === null ||
        sourceFilePath === undefined ||
        (typeof sourceFilePath === 'string' && sourceFilePath.trim() === '')
      ) {
        throw new Error(
          `source_file_path cannot be null or empty when source_type is "${rawSourceType}"`,
        );
      }
    }
  }

  static validateTargetFields(instance: Migration) {
    const getVal = (snake: string, camel: string, altSnake?: string, altCamel?: string) => {
      let v =
        (instance as any)[snake] !== undefined
          ? (instance as any)[snake]
          : (instance as any)[camel];
      if (v !== undefined) return v;
      if (altSnake && (instance as any)[altSnake] !== undefined) return (instance as any)[altSnake];
      if (altCamel && (instance as any)[altCamel] !== undefined) return (instance as any)[altCamel];
      if (typeof instance.getDataValue === 'function') {
        const valFromData = instance.getDataValue(snake as any);
        if (valFromData !== undefined) return valFromData;
        const valFromCamel = instance.getDataValue(camel as any);
        if (valFromCamel !== undefined) return valFromCamel;
        if (altSnake) {
          const valFromAlt = instance.getDataValue(altSnake as any);
          if (valFromAlt !== undefined) return valFromAlt;
        }
        if (altCamel) {
          const valFromAltCamel = instance.getDataValue(altCamel as any);
          if (valFromAltCamel !== undefined) return valFromAltCamel;
        }
      }
      return undefined;
    };

    // 1. Validate target_type (cannot be null, must be in enum)
    const rawTargetType = getVal('target_type', 'targetType', 'taget_type', 'tagetType');

    if (!rawTargetType) {
      throw new Error('target_type is required and cannot be null');
    }

    const validTargetTypes = Object.values(MigrationTargetType);
    if (!validTargetTypes.includes(rawTargetType)) {
      throw new Error(
        `target_type must be one of: ${validTargetTypes.join(', ')}`,
      );
    }

    // Sync to model instance attributes if needed
    if (!instance.target_type && rawTargetType) {
      instance.target_type = rawTargetType;
    }

    // 2. Validate target_schema (never null, default 'public')
    const targetSchema = getVal('target_schema', 'targetSchema');
    if (targetSchema === null) {
      throw new Error('target_schema cannot be null');
    }
    if (targetSchema === undefined || targetSchema === '') {
      instance.target_schema = 'public';
    }

    // 3. Validate target_database (never null, user must provide value)
    const targetDatabase = getVal('target_database', 'targetDatabase');
    if (
      targetDatabase === null ||
      targetDatabase === undefined ||
      (typeof targetDatabase === 'string' && targetDatabase.trim() === '')
    ) {
      throw new Error('target_database is required and cannot be null');
    }

    // 4. Validate target_table (never null, user must provide value)
    const targetTable = getVal('target_table', 'targetTable');
    if (
      targetTable === null ||
      targetTable === undefined ||
      (typeof targetTable === 'string' && targetTable.trim() === '')
    ) {
      throw new Error('target_table is required and cannot be null');
    }
  }
}
