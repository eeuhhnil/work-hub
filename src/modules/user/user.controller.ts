import { Controller } from '@nestjs/common'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'

@Controller('users')
@ApiTags('Users')
@ApiBearerAuth()
export class UserController {}
