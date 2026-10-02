import { applyDecorators, SetMetadata, UseGuards } from '@nestjs/common';
import { PermissionsGuard, PERMISSIONS_KEY } from './permissions.guard';

export { PERMISSIONS_KEY };

export function RequirePermissions(...permissions: string[]) {
  return applyDecorators(
    SetMetadata(PERMISSIONS_KEY, permissions),
    UseGuards(PermissionsGuard),
  );
}
