import {
  Body,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Post,
  Query,
  UnauthorizedException,
} from '@nestjs/common';
import { MigrationsService } from './migrations.service';
import { CreateMigrationDto } from './dto/create-migration.dto';
import { CurrentUser } from '../auth/auth.guard';

@Controller('migrations')
export class MigrationsController {
  constructor(private readonly migrationsService: MigrationsService) {}

  @Get()
  async getMigrations(
    @CurrentUser() user: { id: string } | null,
    @Query('projectId') projectId?: string,
  ) {
    if (!user?.id) {
      throw new UnauthorizedException(
        'Authentication required to retrieve migrations',
      );
    }

    try {
      const migrations = await this.migrationsService.getMigrationsForUser(
        user.id,
        projectId,
      );

      return {
        statusCode: HttpStatus.OK,
        migrations,
      };
    } catch (error: any) {
      throw new HttpException(
        error.message || 'Internal server error',
        error.status || HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Post('create')
  async create(
    @Body() body: CreateMigrationDto,
    @CurrentUser() user: { id: string } | null,
  ) {
    if (!user?.id) {
      throw new UnauthorizedException(
        'Authentication required to create a migration',
      );
    }

    try {
      const migration = await this.migrationsService.createMigration(
        body,
        user.id,
      );

      return {
        statusCode: HttpStatus.CREATED,
        message: 'Migration created successfully',
        data: migration,
      };
    } catch (error: any) {
      throw new HttpException(
        error.message || 'Internal server error',
        error.status || HttpStatus.BAD_REQUEST,
      );
    }
  }
}
