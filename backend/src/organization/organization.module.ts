import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { OrganizationController } from './organization.controller';
import { OrganizationService } from './organization.service';
import { ProjectController } from './project.controller';
import { ProjectService } from './project.service';
import { Organization } from '../../models/organization.model';
import { User } from '../../models/user.model';
import { OrganizationUser } from '../../models/organization-user.model';
import { OrganizationInvitation } from '../../models/organization-invitation.model';
import { Project } from '../../models/project.model';
import { ProjectUser } from '../../models/project-user.model';
import { Migration } from '../../models/migration.model';

@Module({
  imports: [
    SequelizeModule.forFeature([
      Organization,
      User,
      OrganizationUser,
      OrganizationInvitation,
      Project,
      ProjectUser,
      Migration,
    ]),
  ],
  controllers: [OrganizationController, ProjectController],
  providers: [OrganizationService, ProjectService],
})
export class OrganizationModule {}
