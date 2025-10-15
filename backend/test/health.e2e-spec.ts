import { Test, TestingModule } from '@nestjs/testing';
import {
  INestApplication,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import * as request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { CloudWatchLogger } from './../src/utils/cloudwatch-logger';
import { PrismaService } from './../src/prisma/prisma.service';
import { AuthGuard } from '@nestjs/passport';

// Mock CloudWatchLogger
const mockCloudWatchLogger = {
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
  verbose: jest.fn(),
  sendLog: jest.fn().mockResolvedValue(undefined),
  sendToCloudWatch: jest.fn(),
  onModuleDestroy: jest.fn(),
};

describe('HealthController (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let authToken: string;
  let userId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(CloudWatchLogger)
      .useValue(mockCloudWatchLogger)
      .overrideGuard(AuthGuard('jwt'))
      .useValue({
        canActivate: (context: ExecutionContext) => {
          const req = context.switchToHttp().getRequest();
          const authHeader = req.headers.authorization;

          // Authorization 헤더가 없으면 401 에러
          if (!authHeader) {
            throw new UnauthorizedException();
          }

          // 있으면 인증 통과
          req.user = {
            id: userId,
            email: 'health-test@example.com',
            name: 'Health Test User',
          };
          return true;
        },
      })
      .compile();

    app = moduleFixture.createNestApplication();
    prisma = app.get<PrismaService>(PrismaService);
    await app.init();

    // 테스트용 사용자 생성 및 로그인
    await prisma.user.deleteMany({});

    const registerResponse = await request
      .default(app.getHttpServer())
      .post('/auth/register')
      .send({
        name: 'Health Test User',
        email: 'health-test@example.com',
        password: 'password123',
      });

    userId = registerResponse.body.id;

    const loginResponse = await request
      .default(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'health-test@example.com',
        password: 'password123',
      });

    authToken = loginResponse.body.access_token;
  });

  afterAll(async () => {
    await prisma.user.deleteMany({});
    await app.close();
  });

  describe('GET /health', () => {
    it('인증된 사용자의 헬스체크가 성공해야 함', () => {
      return request
        .default(app.getHttpServer())
        .get('/health')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('status', 'success');
          expect(res.body).toHaveProperty(
            'message',
            '서버가 정상 작동 중입니다',
          );
          expect(res.body).toHaveProperty('timestamp');
        });
    });

    it('인증 없이 접근 시 401 에러를 반환해야 함', () => {
      return request.default(app.getHttpServer()).get('/health').expect(401);
    });
  });

  describe('GET /health/public', () => {
    it('퍼블릭 헬스체크가 성공해야 함', () => {
      return request
        .default(app.getHttpServer())
        .get('/health/public')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('status', 'success');
          expect(res.body).toHaveProperty('message');
          expect(res.body).toHaveProperty('timestamp');
        });
    });

    it('인증 없이도 접근할 수 있어야 함', () => {
      return request
        .default(app.getHttpServer())
        .get('/health/public')
        .expect(200);
    });
  });
});
