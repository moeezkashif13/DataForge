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
}
