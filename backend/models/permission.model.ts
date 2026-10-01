import {
  Table,
  Column,
  Model,
  DataType,
  Index,
  HasMany,
} from 'sequelize-typescript';
import { OrganizationUserPermission } from './organization-user-permission.model';

@Table({
  tableName: 'permissions',
  timestamps: true,
})
export class Permission extends Model<Permission> {
  @Column({
    type: DataType.UUID,
    defaultValue: DataType.UUIDV4,
    primaryKey: true,
  })
  declare id: string;

  @Index({
    name: 'permissions_name_unique_idx',
    unique: true,
  })
  @Column({
    type: DataType.STRING(100),
    allowNull: false,
    unique: true,
  })
  declare name: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  declare description: string;

  @HasMany(() => OrganizationUserPermission)
  declare organizationUserPermissions: OrganizationUserPermission[];
}
