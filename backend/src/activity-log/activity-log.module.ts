import { Module } from '@nestjs/common';
import { ActivityLogService } from './activity-log.service';
import { ActivityLogController } from './activity-log.controller';
import { PrismaService } from '../prisma/prisma.service';
import { CloudWatchLogger } from 'src/utils/cloudwatch-logger';

@Module({
  controllers: [ActivityLogController],
  providers: [ActivityLogService, PrismaService, CloudWatchLogger],
  exports: [ActivityLogService],
})
export class ActivityLogModule {}
