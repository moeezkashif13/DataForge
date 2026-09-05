import { Injectable } from '@nestjs/common';
import { InjectModel, InjectConnection } from '@nestjs/sequelize';
import { Transaction } from 'sequelize';
import { Sequelize } from 'sequelize-typescript';
import { Organization } from '../../models/organization.model';
import { User } from '../../models/user.model';
import { OrganizationUser } from '../../models/organization-user.model';
import { OrganizationInvitation } from '../../models/organization-invitation.model';
import { auth } from '../auth/auth';
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

  private async createUserWithBetterAuth(input: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
  }) {
    const signUp = await auth.api.signUpEmail({
      body: {
        name: `${input.firstName} ${input.lastName}`.trim(),
        email: input.email,
        password: input.password,
        firstName: input.firstName,
        lastName: input.lastName,
      },
    });

    const session = 'session' in signUp ? (signUp as any).session : null;
    const token = ('token' in signUp && signUp.token) || session?.token || null;

    return {
      id: signUp.user.id,
      email: signUp.user.email,
      name: signUp.user.name,
      user: signUp.user,
      session,
      token,
    };
  }

  private async rollbackUser(userId: string): Promise<void> {
    await this.userModel.destroy({ where: { id: userId } });
  }

  async createOrganization(
    name: string,
    transaction?: Transaction,
  ): Promise<Organization> {
    return this.organizationModel.create(
      { name } as any,
      transaction ? { transaction } : undefined,
    );
  }

  async createInitialUser(
    firstName: string,
    lastName: string,
    email: string,
    password: string,
    transaction?: Transaction,
  ) {
    return this.createUserWithBetterAuth({
      firstName,
      lastName,
      email,
      password,
    });
  }

  async associateUserToOrganization(
    organizationId: string,
    userId: string,
    role: 'admin' | 'user',
    transaction?: Transaction,
  ): Promise<OrganizationUser> {
    return this.organizationUserModel.create(
      { organizationId, userId, role } as any,
      transaction ? { transaction } : undefined,
    );
  }

  async registerOrganization(input: {
    organizationName: string;
    userFirstName: string;
    userLastName: string;
    userEmail: string;
    userPassword: string;
  }) {
    const authResult = await this.createUserWithBetterAuth({
      firstName: input.userFirstName,
      lastName: input.userLastName,
      email: input.userEmail,
      password: input.userPassword,
    });

    try {
      const result = await this.sequelize.transaction(async (transaction) => {
        const organization = await this.createOrganization(
          input.organizationName,
          transaction,
        );
        await this.associateUserToOrganization(
          organization.id,
          authResult.id,
          'admin',
          transaction,
        );
        return {
          organization,
          user: authResult.user,
          session: authResult.session,
          token: authResult.token,
        };
      });
      return result;
    } catch (error) {
      await this.rollbackUser(authResult.id);
      throw error;
    }
  }

  async inviteUser(input: {
    organizationId: string;
    invitedBy: string;
    email: string;
  }): Promise<OrganizationInvitation> {
    const token = this.generateInviteToken();
    const expiresAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);

    const invitation = this.organizationInvitationModel.create({
      organizationId: input.organizationId,
      invitedBy: input.invitedBy,
      email: input.email,
      token,
      status: 'pending',
      expiresAt,
    } as any);

    return invitation;
  }

  async acceptInvitation(input: {
    token: string;
    firstName: string;
    lastName: string;
    password: string;
    email?: string;
  }) {
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

    const authResult = await this.createUserWithBetterAuth({
      firstName: input.firstName,
      lastName: input.lastName,
      email: input.email || invitation.email,
      password: input.password,
    });

    try {
      const result = await this.sequelize.transaction(async (transaction) => {
        await this.associateUserToOrganization(
          invitation.organizationId,
          authResult.id,
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

        if (!organization) {
          throw new Error('Organization not found');
        }

        return {
          organization,
          user: authResult.user,
          session: authResult.session,
          token: authResult.token,
        };
      });
      return result;
    } catch (error) {
      await this.rollbackUser(authResult.id);
      throw error;
    }
  }

  async clearTables() {
    const ALLOWED_TABLES = [
      'session',
      'account',
      'verification',
      'project_users',
      'projects',
      'organization_invitations',
      'organization_users',
      'users',
      'organizations',
    ];

    for (const table of ALLOWED_TABLES) {
      await this.sequelize.query(`DELETE FROM "${table}"`);
    }

    return true;
  }
}
