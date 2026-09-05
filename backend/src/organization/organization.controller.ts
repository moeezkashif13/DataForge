//@ts-nocheck

import {
  Body,
  Controller,
  HttpException,
  HttpStatus,
  Post,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { OrganizationService } from './organization.service';
import { AllowAnonymous, Session, CurrentUser } from '../auth/auth.guard';
import { getSessionCookieOptions } from '../auth/auth';

@Controller('organization')
export class OrganizationController {
  constructor(private readonly organizationService: OrganizationService) {}

  @AllowAnonymous()
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
    @Res({ passthrough: true }) res: Response,
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
      const result = await this.organizationService.registerOrganization({
        organizationName,
        userFirstName,
        userLastName,
        userEmail,
        userPassword,
      });

      if (result.token) {
        res.cookie(
          'better-auth.session_token',
          result.token,
          getSessionCookieOptions(),
        );
        res.setHeader('set-auth-token', result.token);
      }

      return {
        statusCode: 201,
        message: 'Organization and initial user created successfully',
        organizationId: result.organization.id,
        user: result.user,
        session: result.session,
        token: result.token,
      };
    } catch (error: any) {
      throw new HttpException(
        error.message || 'Failed to create organization and user',
        error.status || HttpStatus.BAD_REQUEST,
      );
    }
  }

  @AllowAnonymous()
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
    @Body() body: { organizationId: string; email: string },
    @CurrentUser() user: { id: string } | null,
  ) {
    const { organizationId, email } = body;

    if (!organizationId || !email) {
      throw new HttpException(
        'organizationId and email are required',
        HttpStatus.BAD_REQUEST,
      );
    }

    const invitedBy = user?.id;
    if (!invitedBy) {
      throw new HttpException(
        'Authentication required to invite users',
        HttpStatus.UNAUTHORIZED,
      );
    }

    try {
      const invitation = await this.organizationService.inviteUser({
        organizationId,
        invitedBy,
        email,
      });

      return {
        statusCode: 201,
        message: 'Invitation created successfully',
        token: invitation.token,
        expiresAt: invitation.expiresAt,
      };
    } catch (error: any) {
      console.error('Error creating invitation:', error);
      throw new HttpException(
        error.message || 'Internal server error',
        error.status || HttpStatus.BAD_REQUEST,
      );
    }
  }

  @AllowAnonymous()
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
    @Res({ passthrough: true }) res: Response,
  ) {
    const { token, firstName, lastName, password, email } = body;

    if (!token || !firstName || !lastName || !password) {
      throw new HttpException(
        'token, firstName, lastName, and password are required',
        HttpStatus.BAD_REQUEST,
      );
    }

    try {
      const result = await this.organizationService.acceptInvitation({
        token,
        firstName,
        lastName,
        password,
        email,
      });

      if (result.token) {
        res.cookie(
          'better-auth.session_token',
          result.token,
          getSessionCookieOptions(),
        );
        res.setHeader('set-auth-token', result.token);
      }

      return {
        statusCode: 201,
        message: 'Invitation accepted successfully',
        organizationId: result.organization.id,
        user: result.user,
        session: result.session,
        token: result.token,
      };
    } catch (error: any) {
      console.error('Error accepting invitation:', error);
      throw new HttpException(
        error.message || 'Internal server error',
        error.status || HttpStatus.BAD_REQUEST,
      );
    }
  }
}
