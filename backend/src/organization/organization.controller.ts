//@ts-nocheck

import {
  Body,
  Controller,
  HttpException,
  HttpStatus,
  Post,
} from '@nestjs/common';
import { OrganizationService } from './organization.service';

@Controller('organization')
export class OrganizationController {
  constructor(private readonly organizationService: OrganizationService) {}

  @Post('register')
  async createOrganization(
    @Body()
    body: {
      organizationName: string;
      userFirstName: string;
      userLastName: string;
      userEmail: string;
      userPassword: string;
    },
  ) {
    const {
      organizationName,
      userFirstName,
      userLastName,
      userEmail,
      userPassword,
    } = body;

    if (
      !organizationName ||
      !userFirstName ||
      !userLastName ||
      !userEmail ||
      !userPassword
    ) {
      return { statusCode: 400, message: 'Missing required fields' };
    }

    try {
      const { organization, user } =
        await this.organizationService.registerOrganization({
          organizationName,
          userFirstName,
          userLastName,
          userEmail,
          userPassword,
        });

      return {
        statusCode: 201,
        message: 'Organization and initial user created successfully',
        organizationId: organization.id,
        userId: user.id,
      };
    } catch (error) {
      throw new HttpException('Internal server error', HttpStatus.BAD_REQUEST);
    }
  }

  @Post('clear-tables')
  async clearTables() {
    try {
      const result = await this.organizationService.clearTables();
      return {
        statusCode: 200,
        message: 'Tables cleared successfully',
        deleted: result,
      };
    } catch (error) {
      console.error('Error clearing tables:', error);
      throw new HttpException(
        error.message || 'Internal server error',
        error.status || HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Post('invite')
  async inviteUser(
    @Body() body: { organizationId: string; email: string; invitedBy?: string },
  ) {
    const { organizationId, email, invitedBy } = body;

    if (!organizationId || !email) {
      throw new HttpException(
        'organizationId and email are required',
        HttpStatus.BAD_REQUEST,
      );
    }

    try {
      const invitation = await this.organizationService.inviteUser({
        organizationId,
        invitedBy: invitedBy || '',
        email,
      });

      return {
        statusCode: 201,
        message: 'Invitation created successfully',
        token: invitation.token,
        expiresAt: invitation.expiresAt,
      };
    } catch (error) {
      console.error('Error creating invitation:', error);
      throw new HttpException(
        error.message || 'Internal server error',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Post('accept-invitation')
  async acceptInvitation(
    @Body()
    body: {
      token: string;
      firstName: string;
      lastName: string;
      password: string;
      email?: string;
    },
  ) {
    const { token, firstName, lastName, password, email } = body;

    if (!token || !firstName || !lastName || !password) {
      throw new HttpException(
        'token, firstName, lastName, and password are required',
        HttpStatus.BAD_REQUEST,
      );
    }

    try {
      const { organization, user } =
        await this.organizationService.acceptInvitation({
          token,
          firstName,
          lastName,
          password,
          email,
        });

      return {
        statusCode: 201,
        message: 'Invitation accepted successfully',
        organizationId: organization.id,
        userId: user.id,
      };
    } catch (error) {
      console.error('Error accepting invitation:', error);
      throw new HttpException(
        error.message || 'Internal server error',
        HttpStatus.BAD_REQUEST,
      );
    }
  }
}
