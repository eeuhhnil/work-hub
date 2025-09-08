import { Controller, Get, Param, Post, Query } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import { SessionService } from './session.service'
import { QuerySessionDto } from './dtos'
import { Public } from '../auth/decorators'

@Controller('sessions')
@ApiTags('Sessions')
@ApiBearerAuth()
export class SessionController {
  constructor(private readonly sessionService: SessionService) {}

  @Get(':id')
  @ApiOperation({ summary: 'Get session by ID' })
  async findOne(@Param('id') id: string) {
    return this.sessionService.findOne({ _id: id })
  }

  @Get()
  @ApiOperation({ summary: 'Get all sessions with pagination' })
  async findMany(@Query() query: QuerySessionDto) {
    return this.sessionService.findMany(query)
  }
}
