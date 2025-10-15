import { Module } from '@nestjs/common';
import { TestController } from './test.controller';
import { CloudWatchLogger } from '../utils/cloudwatch-logger';

@Module({
  controllers: [TestController],
  providers: [CloudWatchLogger],
})
export class TestModule {}
