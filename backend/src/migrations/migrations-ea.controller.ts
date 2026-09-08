import {
  Body,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { MigrationsService } from './migrations.service';
import { CreateMigrationDto } from './dto/create-migration.dto';
import { CurrentUser } from '../auth/auth.guard';
import { EAAuth } from './guards/ea-auth.guard';

@Controller('migrations-ea')
export class MigrationsEAController {
  constructor(private readonly migrationsService: MigrationsService) {}

  @EAAuth()
  @Get()
  async getEAMigrations() {
    return 'hello';
  }
}
