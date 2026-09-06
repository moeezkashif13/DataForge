import {
  Table,
  Column,
  Model,
  DataType,
  ForeignKey,
  BelongsTo,
  Index,
} from 'sequelize-typescript';
import { Agent } from './agent.model';

@Table({
  tableName: 'connection_tokens',
  timestamps: true,
})
export class ConnectionToken extends Model<ConnectionToken> {
  @Column({
    type: DataType.UUID,
    defaultValue: DataType.UUIDV4,
    primaryKey: true,
  })
  declare id: string;

  @ForeignKey(() => Agent)
  @Index
  @Column({
    type: DataType.UUID,
    allowNull: false,
    field: 'agent_id',
  })
  declare agentId: string;

  @Column({
    type: DataType.STRING(255),
    allowNull: false,
  })
  declare token: string;

  @Column({
    type: DataType.DATE,
    allowNull: true,
    field: 'expires_at',
  })
  declare expiresAt: Date | null;

  @Column({
    type: DataType.DATE,
    allowNull: true,
    field: 'last_used_at',
  })
  declare lastUsedAt: Date | null;

  @Column({
    type: DataType.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    field: 'is_revoked',
  })
  declare isRevoked: boolean;

  @BelongsTo(() => Agent, {
    foreignKey: 'agentId',
    onDelete: 'CASCADE',
  })
  declare agent: Agent;
}
