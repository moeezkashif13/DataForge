import {
  Table,
  Column,
  Model,
  DataType,
  ForeignKey,
  BelongsTo,
  Index,
} from 'sequelize-typescript';

import { Organization } from './organization.model';
import { User } from './user.model';

@Table({
  tableName: 'organization_users',
  timestamps: true,
  indexes: [
    {
      name: 'idx_organization_users_user_role',
      fields: ['userId', 'role'],
    },
  ],
})
export class OrganizationUser extends Model<OrganizationUser> {
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
}
