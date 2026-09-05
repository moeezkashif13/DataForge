import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { OrganizationController } from './organization.controller';
import { OrganizationService } from './organization.service';
import { Organization } from '../../models/organization.model';
import { User } from '../../models/user.model';
import { OrganizationUser } from '../../models/organization-user.model';
import { OrganizationInvitation } from '../../models/organization-invitation.model';

@Module({
  imports: [
    SequelizeModule.forFeature([
      Organization,
      User,
      OrganizationUser,
      OrganizationInvitation,
    ]),
  ],
  controllers: [OrganizationController],
  providers: [OrganizationService],
})
export class OrganizationModule {}
