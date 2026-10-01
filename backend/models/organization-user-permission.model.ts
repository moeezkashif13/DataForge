import {
  Table,
  Column,
  Model,
  DataType,
  ForeignKey,
  BelongsTo,
  Index,
} from 'sequelize-typescript';
import { OrganizationUser } from './organization-user.model';
import { Permission } from './permission.model';

@Table({
  tableName: 'organization_user_permissions',
  timestamps: true,
  indexes: [
    {
      name: 'org_user_permissions_unique_idx',
      unique: true,
      fields: ['organizationUserId', 'permissionId'],
    },
  ],
})
export class OrganizationUserPermission extends Model<OrganizationUserPermission> {
  @Column({
    type: DataType.UUID,
    defaultValue: DataType.UUIDV4,
    primaryKey: true,
  })
  declare id: string;

  @ForeignKey(() => OrganizationUser)
  @Index({ name: 'org_user_permissions_user_idx' })
  @Column({
    type: DataType.UUID,
    allowNull: false,
    field: 'organization_user_id',
  })
  declare organizationUserId: string;

  @ForeignKey(() => Permission)
  @Index({ name: 'org_user_permissions_perm_idx' })
  @Column({
    type: DataType.UUID,
    allowNull: false,
    field: 'permission_id',
  })
  declare permissionId: string;

  @BelongsTo(() => OrganizationUser, {
    onDelete: 'CASCADE',
  })
  declare organizationUser: OrganizationUser;

  @BelongsTo(() => Permission, {
    onDelete: 'CASCADE',
  })
  declare permission: Permission;
}
