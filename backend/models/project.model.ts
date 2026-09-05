import {
  Table,
  Column,
  Model,
  DataType,
  ForeignKey,
  BelongsTo,
  HasMany,
  Index,
} from 'sequelize-typescript';

import { Organization } from './organization.model';
import { ProjectUser } from './project-user.model';

@Table({
  tableName: 'projects',
  timestamps: true,
})
export class Project extends Model<Project> {
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

  @ForeignKey(() => Organization)
  @Index
  @Column({
    type: DataType.UUID,
    allowNull: false,
  })
  declare organizationId: string;

  @Column({
    type: DataType.ENUM('active', 'archived'),
    allowNull: false,
    defaultValue: 'active',
  })
  declare status: 'active' | 'archived';

  @BelongsTo(() => Organization, {
    onDelete: 'CASCADE',
  })
  declare organization: Organization;

  @HasMany(() => ProjectUser)
  declare projectUsers: ProjectUser[];
}