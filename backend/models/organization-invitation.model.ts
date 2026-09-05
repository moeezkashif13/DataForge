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
  tableName: 'organization_invitations',
  timestamps: true,
})
export class OrganizationInvitation extends Model<OrganizationInvitation> {
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
  @Column({
    type: DataType.UUID,
    allowNull: true,
  })
  declare invitedBy: string;

  @Column({
    type: DataType.STRING(255),
    allowNull: false,
  })
  declare email: string;

  @Column({
    type: DataType.STRING(255),
    allowNull: false,
    unique: true,
  })
  declare token: string;

  @Column({
    type: DataType.ENUM('pending', 'accepted', 'expired', 'revoked'),
    allowNull: false,
    defaultValue: 'pending',
  })
  declare status: 'pending' | 'accepted' | 'expired' | 'revoked';

  @Column({
    type: DataType.DATE,
    allowNull: true,
  })
  declare expiresAt: Date;

  @Column({
    type: DataType.DATE,
    allowNull: true,
  })
  declare acceptedAt: Date;

  @BelongsTo(() => Organization, {
    onDelete: 'CASCADE',
  })
  declare organization: Organization;

  @BelongsTo(() => User, {
    as: 'inviter',
  })
  declare inviter: User;
}
