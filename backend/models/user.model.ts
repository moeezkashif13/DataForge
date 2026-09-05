import { Table, Column, Model, DataType, HasMany } from 'sequelize-typescript';
import { OrganizationUser } from './organization-user.model';

@Table({
  tableName: 'users',
  timestamps: true,
})
export class User extends Model<User> {
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
  declare firstName: string;

  @Column({
    type: DataType.STRING(255),
    allowNull: false,
  })
  declare lastName: string;

  @Column({
    type: DataType.STRING(255),
    allowNull: false,
    unique: true,
  })
  declare email: string;

  @Column({
    type: DataType.STRING(255),
    allowNull: false,
  })
  declare passwordHash: string;

  @HasMany(() => OrganizationUser)
  declare organizationUsers: OrganizationUser[];
}
