import {
  Table,
  Column,
  Model,
  DataType,
  HasMany,
  BelongsToMany,
} from 'sequelize-typescript';
import { OrganizationUser } from './organization-user.model';
import { Project } from './project.model';
import { ProjectUser } from './project-user.model';
import { Migration } from './migration.model';

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
    allowNull: true,
  })
  declare firstName: string | null;

  @Column({
    type: DataType.STRING(255),
    allowNull: true,
  })
  declare lastName: string | null;

  @Column({
    type: DataType.STRING(255),
    allowNull: false,
  })
  declare name: string;

  @Column({
    type: DataType.STRING(255),
    allowNull: false,
    unique: true,
  })
  declare email: string;

  @Column({
    type: DataType.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  })
  declare emailVerified: boolean;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  declare image: string;

  @HasMany(() => OrganizationUser)
  declare organizationUsers: OrganizationUser[];

  @BelongsToMany(() => Project, () => ProjectUser)
  declare projects: Project[];

  @HasMany(() => Migration, { foreignKey: 'createdBy' })
  declare createdMigrations: Migration[];
}