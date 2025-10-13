import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { HealthModule } from './health/health.module';
import { ActivityLogModule } from './activity-log/activity-log.module';
import { SecurityFilterMiddleware } from './middleware/security-filter.middleware';
import { CloudWatchLogger } from './utils/cloudwatch-logger';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    AuthModule,
    UsersModule,
    HealthModule,
    ActivityLogModule,
  ],
  controllers: [AppController],
  providers: [AppService, CloudWatchLogger],
  exports: [CloudWatchLogger], // 추가 - 다른 모듈에서 사용하기 위해
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(SecurityFilterMiddleware).forRoutes('*');
  }
}
