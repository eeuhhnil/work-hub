import { SystemRole } from '../../../common/enums/system-role'

export type AuthPayload = {
  sub: string
  email: string
  role: SystemRole
}
