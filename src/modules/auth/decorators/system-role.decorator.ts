import { applyDecorators, SetMetadata, UseGuards } from '@nestjs/common'
import { SystemRoleGuard } from '../guards/system-role.guard'

export const USER_ROLE_KEY = 'user_role'
export const UserRoles = (...permissions: string[]) => {
  return applyDecorators(
    SetMetadata(USER_ROLE_KEY, permissions),
    UseGuards(SystemRoleGuard),
  )
}
