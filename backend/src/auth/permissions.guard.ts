import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectModel } from '@nestjs/sequelize';
import { OrganizationUser } from '../../models/organization-user.model';
import { OrganizationUserPermission } from '../../models/organization-user-permission.model';
import { Permission } from '../../models/permission.model';

export const PERMISSIONS_KEY = 'permissions';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @InjectModel(OrganizationUser)
    private readonly organizationUserModel: typeof OrganizationUser,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user?.id) {
      throw new UnauthorizedException('Authentication required');
    }

    const organizationId =
      request.params?.organizationId ||
      request.params?.orgId ||
      request.headers['x-organization-id'] ||
      request.query?.organizationId ||
      request.body?.organizationId;

    if (!organizationId) {
      throw new BadRequestException(
        'Organization context (organizationId) is required to evaluate permissions',
      );
    }

    const membership = await this.organizationUserModel.findOne({
      where: {
        userId: user.id,
        organizationId,
      },
      include: [
        {
          model: OrganizationUserPermission,
          include: [
            {
              model: Permission,
              attributes: ['name'],
            },
          ],
        },
      ],
    });

    if (!membership) {
      throw new ForbiddenException('You are not a member of this organization');
    }

    const grantedPermissions = new Set<string>(
      (membership.organizationUserPermissions || [])
        .map((oup: any) => oup.permission?.name)
        .filter(Boolean),
    );

    const hasAllRequired = requiredPermissions.every((perm) =>
      grantedPermissions.has(perm),
    );

    if (!hasAllRequired) {
      throw new ForbiddenException(`Insufficient permissions`);
    }

    request.organizationUser = membership;
    request.userPermissions = Array.from(grantedPermissions);

    return true;
  }
}
