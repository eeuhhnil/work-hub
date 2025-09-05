import {
  Controller,
  Get,
  Param,
  NotFoundException,
  Query,
  UseInterceptors,
  BadRequestException,
  Body,
  UploadedFile,
  Put,
  Delete,
} from '@nestjs/common'
import {
  ApiBearerAuth,
  ApiTags,
  ApiOperation,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger'
import { UserService } from './user.service'
import { StorageService } from '../storage/storage.service'
import { AuthUser } from '../auth/decorators'
import type { AuthPayload } from '../auth/types'
import { QueryUserDto, UpdateProfileDto } from './dtos'
import { FileInterceptor } from '@nestjs/platform-express'
import * as path from 'node:path'
import { UserRoles } from '../auth/decorators/system-role.decorator'
import { SystemRole } from '../../common/enums/system-role'

@Controller('users')
@ApiTags('Users')
@ApiBearerAuth()
export class UserController {
  constructor(
    private readonly userService: UserService,
    private readonly storage: StorageService,
  ) {}

  @Get('/profile')
  @ApiOperation({ summary: 'Get user profile' })
  async getProfile(@AuthUser() authPayload: AuthPayload) {
    const user = await this.userService.getProfile(authPayload.sub)
    if (!user) throw new NotFoundException('User does not exist')

    return {
      message: 'Get user profile successfully!',
      data: user.toJSON(),
    }
  }

  @Get()
  async findMany(@Query() query: QueryUserDto) {
    return this.userService.findMany(query)
  }

  @Put('/profile')
  @ApiOperation({ summary: 'Update user profile' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        username: {
          type: 'string',
        },
        email: {
          type: 'string',
        },
        fullName: {
          type: 'string',
        },
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 5 * 1024 * 1024 },
      fileFilter: (req, file, callback) => {
        if (
          !file.mimetype.startsWith('image/') ||
          file.mimetype === 'image/gif'
        ) {
          return callback(
            new BadRequestException('Only images accepted'),
            false,
          )
        }
        callback(null, true)
      },
    }),
  )
  async updateProfile(
    @AuthUser() authPayload: AuthPayload,
    @Body() payload: UpdateProfileDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    let avatar: string | undefined
    if (file) {
      const processedAvatar = await this.storage.proccessAvatarFile(file)
      const fileExtension = path.extname(processedAvatar.originalname)
      avatar = await this.storage.uploadFile(
        `users/${authPayload.sub}/${fileExtension}`,
        processedAvatar,
      )
    }
    payload['avatar'] = avatar
    return await this.userService.updateProfile(authPayload.sub, payload)
  }

  @Delete('/:userId')
  @UserRoles(SystemRole.ADMIN)
  @ApiOperation({ summary: 'Delete one user' })
  async deleteOne(@Param('userId') userId: string) {
    return {
      message: 'Deleted user profile',
      data: await this.userService.deleteOne(userId),
    }
  }
}
