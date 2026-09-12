import {
  Injectable,
  ForbiddenException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
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
    const normalizedEmail = input.email.trim().toLowerCase();

    const existingUser = await this.userModel.findOne({
      where: { email: normalizedEmail },
    });

    let authResponse: any;
    let authData: any;
    let isNewUser = false;

    if (existingUser) {
      authResponse = await auth.api.signInEmail({
        body: {
          email: normalizedEmail,
          password: input.password,
        },
        asResponse: true,
      });
      authData = await authResponse.json();
    } else {
      isNewUser = true;
      authResponse = await auth.api.signUpEmail({
        body: {
          name: `${input.firstName} ${input.lastName}`.trim(),
          email: normalizedEmail,
          password: input.password,
          firstName: input.firstName,
          lastName: input.lastName,
        },
        asResponse: true,
      });
      authData = await authResponse.json();
    }

    if (!authData || !authData.user) {
      throw new BadRequestException(
        authData?.message || authData?.error || 'Authentication failed',
      );
    }

    const token = authData.token || null;

    let session: any = null;
    if (token) {
      try {
        const sessionInfo = await auth.api.getSession({
          headers: {
            authorization: `Bearer ${token}`,
          },
        });
        session = sessionInfo?.session || null;
      } catch (err) {
        console.warn('Failed to retrieve full session object via token:', err);
      }
    }

    const cookies: string[] = [];
    if (authResponse && authResponse.headers) {
      if (typeof (authResponse.headers as any).getSetCookie === 'function') {
        cookies.push(...(authResponse.headers as any).getSetCookie());
      } else {
        const setCookieHeader = authResponse.headers.get('set-cookie');
        if (setCookieHeader) {
          cookies.push(setCookieHeader);
        }
      }
    }

    return {
      id: authData.user.id,
      email: authData.user.email,
      name: authData.user.name,
      user: authData.user,
      session,
      token,
      cookies,
      isNewUser,
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
          cookies: authResult.cookies,
        };
      });
      return result;
    } catch (error) {
      if (authResult.isNewUser) {
        await this.rollbackUser(authResult.id);
      }
      throw error;
    }
  }

  async getUserOrganizations(userId: string): Promise<OrganizationUser[]> {
    return this.organizationUserModel.findAll({
      where: { userId },
      order: [['createdAt', 'ASC']],
      include: [Organization],
    });
  }

  async getUserPrimaryOrganization(
    userId: string,
  ): Promise<Organization | null> {
    const userOrg = await this.organizationUserModel.findOne({
      where: { userId },
      order: [['createdAt', 'ASC']],
      include: [Organization],
    });
    return userOrg?.organization || null;
  }

  async getOrganizationMembers(userId: string, requestedOrgId?: string) {
    let targetOrgId = requestedOrgId;

    if (targetOrgId) {
      const membership = await this.organizationUserModel.findOne({
        where: {
          userId,
          organizationId: targetOrgId,
        },
      });
      if (!membership) {
        throw new ForbiddenException(
          'You do not have access to view members of this organization',
        );
      }
    } else {
      const userOrgs = await this.organizationUserModel.findAll({
        where: { userId },
        order: [['createdAt', 'ASC']],
      });

      if (!userOrgs.length) {
        return { organizationId: null, members: [] };
      }
      targetOrgId = userOrgs[0].organizationId;
    }

    const orgUsers = await this.organizationUserModel.findAll({
      where: { organizationId: targetOrgId },
      include: [
        {
          model: User,
          attributes: ['id', 'name', 'email', 'createdAt'],
        },
      ],
      order: [['createdAt', 'ASC']],
    });

    const pendingInvitations = await this.organizationInvitationModel.findAll({
      where: {
        organizationId: targetOrgId,
        status: 'pending',
      },
      order: [['createdAt', 'DESC']],
    });

    const activeMembers = orgUsers.map((ou) => {
      const u = ou.user;
      const name = u?.name || u?.email?.split('@')[0] || 'Team Member';
      const initials =
        name
          .split(' ')
          .filter(Boolean)
          .map((n: string) => n[0])
          .join('')
          .toUpperCase()
          .slice(0, 2) || 'U';

      const rawRole = (ou.role || 'operator').toLowerCase();
      let role = 'Operator';
      if (rawRole === 'admin') role = 'Admin';
      else if (rawRole === 'owner') role = 'Owner';
      else if (rawRole === 'viewer') role = 'Viewer';

      return {
        id: ou.id,
        userId: ou.userId,
        name,
        email: u?.email || '',
        role,
        status: 'Active',
        joined: new Date(ou.createdAt).toLocaleDateString('en-US', {
          month: 'short',
          year: 'numeric',
        }),
        avatar: initials,
      };
    });

    const invitedMembers = pendingInvitations.map((inv) => {
      const name = inv.email.split('@')[0];
      const initials = name.slice(0, 2).toUpperCase() || 'IN';
      return {
        id: inv.id,
        userId: null,
        name: `${name} (Invited)`,
        email: inv.email,
        role: 'Operator',
        status: 'Pending',
        joined: new Date(inv.createdAt).toLocaleDateString('en-US', {
          month: 'short',
          year: 'numeric',
        }),
        avatar: initials,
        token: inv.token,
        expiresAt: inv.expiresAt,
      };
    });

    return {
      organizationId: targetOrgId,
      members: [...activeMembers, ...invitedMembers],
    };
  }

  async inviteUser(input: {
    organizationId: string;
    invitedBy: string;
    email: string;
  }): Promise<OrganizationInvitation> {
    const normalizedEmail = input.email.trim().toLowerCase();

    const existingInvitation = await this.organizationInvitationModel.findOne({
      where: {
        organizationId: input.organizationId,
        email: normalizedEmail,
        status: 'pending',
      },
    });

    if (existingInvitation) {
      return existingInvitation;
    }

    const token = this.generateInviteToken();
    const expiresAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);

    const invitation = await this.organizationInvitationModel.create({
      organizationId: input.organizationId,
      invitedBy: input.invitedBy,
      email: normalizedEmail,
      token,
      status: 'pending',
      expiresAt,
    } as any);

    return invitation;
  }

  async getInvitationByToken(token: string) {
    const invitation = await this.organizationInvitationModel.findOne({
      where: { token },
    });

    if (!invitation) {
      throw new NotFoundException('Invalid or nonexistent invitation token');
    }

    if (invitation.status !== 'pending') {
      throw new BadRequestException(`Invitation is already ${invitation.status}`);
    }

    if (invitation.expiresAt && invitation.expiresAt.getTime() < Date.now()) {
      throw new BadRequestException('Invitation has expired');
    }

    const organization = await this.organizationModel.findByPk(
      invitation.organizationId,
    );

    return {
      id: invitation.id,
      email: invitation.email,
      organizationId: invitation.organizationId,
      organizationName: organization?.name || 'Organization',
      status: invitation.status,
      expiresAt: invitation.expiresAt,
    };
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
          cookies: authResult.cookies,
        };
      });
      return result;
    } catch (error) {
      if (authResult.isNewUser) {
        await this.rollbackUser(authResult.id);
      }
      throw error;
    }
  }

  async clearTables() {
    const ALLOWED_TABLES = [
      'projects',
      // 'session',
      // 'account',
      // 'verification',
      // 'project_users',
      // 'projects',
      // 'organization_invitations',
      // 'organization_users',
      // 'users',
      // 'organizations',
    ];

    for (const table of ALLOWED_TABLES) {
      await this.sequelize.query(`DELETE FROM "${table}"`);
    }

    return true;
  }
}
