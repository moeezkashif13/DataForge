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
import { ConnectionToken } from './connection-token.model';

export enum AgentStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  CONNECTED = 'connected',
  RUNNING = 'running',
}

@Table({
  tableName: 'agents',
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['organizationId', 'name'],
      name: 'agents_organization_id_name_unique',
    },
  ],
})
export class Agent extends Model<Agent> {
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
    field: 'organization_id',
  })
  declare organizationId: string;

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
    type: DataType.ENUM(...Object.values(AgentStatus)),
    allowNull: false,
    defaultValue: AgentStatus.ACTIVE,
  })
  declare status: AgentStatus;

  @Column({
    type: DataType.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  })
  declare connected: boolean;

  @Column({
    type: DataType.DATE,
    allowNull: true,
    field: 'last_heartbeat_at',
  })
  declare lastHeartbeatAt: Date;

  @ForeignKey(() => User)
  @Index
  @Column({
    type: DataType.UUID,
    allowNull: true,
    field: 'created_by',
  })
  declare createdBy: string | null;

  @BelongsTo(() => Organization, {
    foreignKey: 'organizationId',
    onDelete: 'CASCADE',
  })
  declare organization: Organization;

  @BelongsTo(() => User, {
    foreignKey: 'createdBy',
    onDelete: 'SET NULL',
  })
  declare creator: User;

  @HasMany(() => ConnectionToken)
  declare connectionTokens: ConnectionToken[];
}
