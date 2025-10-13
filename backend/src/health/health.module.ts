import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { CloudWatchLogger } from '../utils/cloudwatch-logger';

@Module({
  controllers: [HealthController],
  providers: [CloudWatchLogger],
})
export class HealthModule {}
