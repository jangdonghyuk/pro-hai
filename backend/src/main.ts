import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { IpFilterGuard } from './guards/ip-filter.guard';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  // CORS 설정 추가
  app.enableCors({
    origin: ['http://localhost:3000'], // 프론트엔드 URL
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  });

  // 보안 가드들 적용 (순서 중요!)
  app.useGlobalGuards(
    new IpFilterGuard(configService), // 그 다음 IP 차단
  );

  // 유효성 검사 파이프 추가
  app.useGlobalPipes(new ValidationPipe());

  await app.listen(3001);
  console.log('Backend server running on http://localhost:3001');
}
bootstrap();
