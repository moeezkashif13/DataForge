import { Table, Column, Model, DataType, HasMany } from 'sequelize-typescript';
import { OrganizationUser } from './organization-user.model';
import { Project } from './project.model';
import { Agent } from './agent.model';

@Table({
  tableName: 'organizations',
  timestamps: true,
})
export class Organization extends Model<Organization> {
  @Column({
    type: DataType.UUID,
    defaultValue: DataType.UUIDV4,
    primaryKey: true,
  })
  declare id: string;

  @Column({
    type: DataType.STRING(255),
    allowNull: false,
    unique: true,
  })
  declare name: string;

  @HasMany(() => OrganizationUser)
  declare organizationUsers: OrganizationUser[];

  @HasMany(() => Project)
  declare projects: Project[];

  @HasMany(() => Agent)
  declare agents: Agent[];
}
