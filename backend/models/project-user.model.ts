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

@Table({
  tableName: 'project_users',
  timestamps: true,
})
export class ProjectUser extends Model<ProjectUser> {
  @Column({
    type: DataType.UUID,
    defaultValue: DataType.UUIDV4,
    primaryKey: true,
  })
  declare id: string;

  @ForeignKey(() => Project)
  @Index
  @Column({
    type: DataType.UUID,
    allowNull: false,
  })
  declare projectId: string;

  @ForeignKey(() => User)
  @Index
  @Column({
    type: DataType.UUID,
    allowNull: false,
  })
  declare userId: string;

  @Column({
    type: DataType.STRING(50),
    allowNull: false,
    defaultValue: 'member',
  })
  declare role: string;

  @BelongsTo(() => Project, {
    onDelete: 'CASCADE',
  })
  declare project: Project;

  @BelongsTo(() => User, {
    onDelete: 'CASCADE',
  })
  declare user: User;
}