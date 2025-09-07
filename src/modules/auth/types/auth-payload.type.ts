import { SystemRole } from '../../../common/enums'

export type AuthPayload = {
  jti: string
  sub: string
  email: string
  role: SystemRole
}
