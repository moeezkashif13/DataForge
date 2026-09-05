import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { MigrationsController } from './migrations.controller';
import { MigrationsService } from './migrations.service';
import { Migration } from '../../models/migration.model';
import { Project } from '../../models/project.model';
import { ProjectUser } from '../../models/project-user.model';
import { User } from '../../models/user.model';

@Module({
  imports: [
    SequelizeModule.forFeature([Migration, Project, ProjectUser, User]),
  ],
  controllers: [MigrationsController],
  providers: [MigrationsService],
  exports: [MigrationsService],
})
export class MigrationsModule {}
