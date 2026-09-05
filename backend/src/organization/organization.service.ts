//@ts-nocheck

import { Injectable } from '@nestjs/common';
import { InjectModel, InjectConnection } from '@nestjs/sequelize';
import { Transaction } from 'sequelize';
import { Sequelize } from 'sequelize-typescript';
import { Organization } from '../../models/organization.model';
import { User } from '../../models/user.model';
import { OrganizationUser } from '../../models/organization-user.model';
import * as bcrypt from 'bcrypt';

@Injectable()
export class OrganizationService {
  constructor(
    @InjectModel(Organization)
    private organizationModel: typeof Organization,

    @InjectModel(User)
    private userModel: typeof User,

    @InjectModel(OrganizationUser)
    private organizationUserModel: typeof OrganizationUser,

    @InjectConnection()
    private sequelize: Sequelize,
  ) {}

  async createOrganization(
    name: string,
    transaction?: Transaction,
  ): Promise<Organization> {
    return this.organizationModel.create(
      { name } as Partial<Organization>,
      transaction ? { transaction } : undefined,
    );
  }

  async createInitialUser(
    firstName: string,
    lastName: string,
    email: string,
    password: string,
    transaction?: Transaction,
  ): Promise<User> {
    const passwordHash = await bcrypt.hash(password, 10);
    return this.userModel.create(
      { firstName, lastName, email, passwordHash } as Partial<User>,
      transaction ? { transaction } : undefined,
    );
  }

  async associateUserToOrganization(
    organizationId: string,
    userId: string,
    role: 'admin' | 'user',
    transaction?: Transaction,
  ): Promise<OrganizationUser> {
    return this.organizationUserModel.create(
      { organizationId, userId, role } as Partial<OrganizationUser>,
      transaction ? { transaction } : undefined,
    );
  }

  async registerOrganization(input: {
    organizationName: string;
    userFirstName: string;
    userLastName: string;
    userEmail: string;
    userPassword: string;
  }): Promise<{ organization: Organization; user: User }> {
    const result = await this.sequelize.transaction(async (transaction) => {
      const organization = await this.createOrganization(
        input.organizationName,
        transaction,
      );
      const user = await this.createInitialUser(
        input.userFirstName,
        input.userLastName,
        input.userEmail,
        input.userPassword,
        transaction,
      );
      await this.associateUserToOrganization(
        organization.id,
        user.id,
        'admin',
        transaction,
      );
      return { organization, user };
    });
    return result;
  }

  async clearTables() {
    const ALLOWED_TABLES = ['organizations', 'users', 'organization_users'];
    // const ALLOWED_TABLES = ['users'];

    const tableNames = ALLOWED_TABLES;

    // if (invalidTables.length > 0) {
    //   throw new BadRequestException(
    //     `Invalid table names: ${invalidTables.join(', ')}`,
    //   );
    // }

    for (const table of tableNames) {
      await this.sequelize.query(`DELETE FROM "${table}"`);
    }

    return true;
  }
}
