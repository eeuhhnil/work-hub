import { Module } from '@nestjs/common'
import { BOMController } from './bom.controller'
import { BOMService } from './bom.service'

@Module({
  controllers: [BOMController],
  providers: [BOMService],
  exports: [BOMService],
})
export class BOMModule {}
