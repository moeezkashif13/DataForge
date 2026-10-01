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
import { User } from './user.model';
import { OrganizationUserPermission } from './organization-user-permission.model';

@Table({
  tableName: 'organization_users',
  timestamps: true,
})
export class OrganizationUser extends Model<OrganizationUser> {
  @Column({
    type: DataType.UUID,
    defaultValue: DataType.UUIDV4,
    primaryKey: true,
  })
  declare id: string;
  @ForeignKey(() => Organization)
  @Index
  @Column({
    type: DataType.UUID,
    allowNull: false,
  })
  declare organizationId: string;

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
    defaultValue: 'user',
  })
  declare role: string;

  @BelongsTo(() => Organization, {
    onDelete: 'CASCADE',
  })
  declare organization: Organization;

  @BelongsTo(() => User, {
    onDelete: 'CASCADE',
  })
  declare user: User;

  @HasMany(() => OrganizationUserPermission)
  declare organizationUserPermissions: OrganizationUserPermission[];
}
