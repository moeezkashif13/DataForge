import {
  Table,
  Column,
  Model,
  DataType,
  ForeignKey,
  BelongsTo,
  Index,
} from 'sequelize-typescript';
import { Project } from './project.model';
import { User } from './user.model';

export enum MigrationStatus {
  ACTIVE = 'active',
  PAUSED = 'paused',
}

@Table({
  tableName: 'migrations',
  timestamps: true,
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
    type: DataType.STRING(1000),
    allowNull: false,
    field: 'source_path',
  })
  declare source_path: string;

  @Column({
    type: DataType.STRING(1000),
    allowNull: false,
    field: 'target_path',
  })
  declare target_path: string;

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
}
