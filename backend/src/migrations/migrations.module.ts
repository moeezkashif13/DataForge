import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { JwtModule } from '@nestjs/jwt';
import { MigrationsController } from './migrations.controller';
import { MigrationsEAController } from './migrations-ea.controller';
import { MigrationsService } from './migrations.service';
import { Migration } from '../../models/migration.model';
import { Project } from '../../models/project.model';
import { ProjectUser } from '../../models/project-user.model';
import { User } from '../../models/user.model';
import { EAAuthGuard } from './guards/ea-auth.guard';

@Module({
  imports: [
    SequelizeModule.forFeature([Migration, Project, ProjectUser, User]),
    JwtModule.register({
      secret: process.env.DEFAULT_JWT_SECRET,
    }),
  ],
  controllers: [MigrationsController, MigrationsEAController],
  providers: [MigrationsService, EAAuthGuard],
  exports: [MigrationsService, EAAuthGuard],
})
export class MigrationsModule {}
