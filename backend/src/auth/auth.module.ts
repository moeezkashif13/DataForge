import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { SequelizeModule } from '@nestjs/sequelize';
import { BetterAuthGuard } from './auth.guard';
import { PermissionsGuard } from './permissions.guard';
import { OrganizationUser } from '../../models/organization-user.model';
import { OrganizationUserPermission } from '../../models/organization-user-permission.model';
import { Permission } from '../../models/permission.model';

@Module({
  imports: [
    SequelizeModule.forFeature([
      OrganizationUser,
      OrganizationUserPermission,
      Permission,
    ]),
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: BetterAuthGuard,
    },
    PermissionsGuard,
  ],
  exports: [PermissionsGuard],
})
export class AuthModule {}