import { SystemRole } from '../../../common/enums/system-role'

export type AuthPayload = {
  jti: string
  sub: string
  email: string
  role: SystemRole
}
