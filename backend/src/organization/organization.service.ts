//@ts-nocheck

import { Injectable } from '@nestjs/common';
import { InjectModel, InjectConnection } from '@nestjs/sequelize';
import { Transaction } from 'sequelize';
import { Sequelize } from 'sequelize-typescript';
import { Organization } from '../../models/organization.model';
import { User } from '../../models/user.model';
import { OrganizationUser } from '../../models/organization-user.model';
import { OrganizationInvitation } from '../../models/organization-invitation.model';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

@Injectable()
export class OrganizationService {
  constructor(
    @InjectModel(Organization)
    private organizationModel: typeof Organization,

    @InjectModel(User)
    private userModel: typeof User,

    @InjectModel(OrganizationUser)
    private organizationUserModel: typeof OrganizationUser,

    @InjectModel(OrganizationInvitation)
    private organizationInvitationModel: typeof OrganizationInvitation,

    @InjectConnection()
    private sequelize: Sequelize,
  ) {}

  private generateInviteToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

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

  async inviteUser(input: {
    organizationId: string;
    invitedBy: string;
    email: string;
  }): Promise<OrganizationInvitation> {
    const token = this.generateInviteToken();
    // Default expiry e.g. 3 days from now
    const expiresAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);

    const invitation = this.organizationInvitationModel.create({
      organizationId: input.organizationId,
      invitedBy: input.invitedBy,
      email: input.email,
      token,
      status: 'pending',
      expiresAt,
    } as Partial<OrganizationInvitation>);

    return invitation;
  }

  async acceptInvitation(input: {
    token: string;
    firstName: string;
    lastName: string;
    password: string;
    email?: string;
  }): Promise<{ organization: Organization; user: User }> {
    const invitation = await this.organizationInvitationModel.findOne({
      where: { token: input.token },
    });

    if (!invitation) {
      throw new Error('Invalid or nonexistent invitation token');
    }

    if (invitation.status !== 'pending') {
      throw new Error(`Invitation is already ${invitation.status}`);
    }

    if (invitation.expiresAt && invitation.expiresAt.getTime() < Date.now()) {
      throw new Error('Invitation has expired');
    }

    const result = await this.sequelize.transaction(async (transaction) => {
      const user = await this.createInitialUser(
        input.firstName,
        input.lastName,
        input.email || invitation.email,
        input.password,
        transaction,
      );

      await this.associateUserToOrganization(
        invitation.organizationId,
        user.id,
        'user',
        transaction,
      );

      invitation.status = 'accepted';
      invitation.acceptedAt = new Date();
      await invitation.save({ transaction });

      const organization = await this.organizationModel.findByPk(
        invitation.organizationId,
        { transaction },
      );

      return { organization, user };
    });

    return result;
  }

  async clearTables() {
    const ALLOWED_TABLES = [
      'project_users',
      'projects',
      'organization_invitations',
      'organization_users',
      'users',
      'organizations',
    ];
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
