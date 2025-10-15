import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { CloudWatchLogger } from './../src/utils/cloudwatch-logger';
import { PrismaService } from './../src/prisma/prisma.service';

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

describe('AuthController (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(CloudWatchLogger)
      .useValue(mockCloudWatchLogger)
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe()); // DTO 검증 활성화
    prisma = app.get<PrismaService>(PrismaService);
    await app.init();
  });

  afterAll(async () => {
    // 테스트 데이터 정리
    await prisma.user.deleteMany({});
    await app.close();
  });

  describe('POST /auth/register', () => {
    const testEmail = 'test@example.com';

    beforeEach(async () => {
      // register 테스트만 매번 사용자 삭제
      await prisma.user.deleteMany({});
    });

    it('회원가입에 성공해야 함', () => {
      return request
        .default(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: testEmail,
          password: 'password123',
          name: 'Test User',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body).toHaveProperty('email', testEmail);
          expect(res.body).toHaveProperty('name', 'Test User');
          expect(res.body).not.toHaveProperty('password'); // 비밀번호는 반환되지 않아야 함
        });
    });

    it('이메일 형식이 잘못된 경우 400 에러를 반환해야 함', async () => {
      const response = await request
        .default(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'invalid-email',
          password: 'password123',
          name: 'Test User',
        });

      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it('비밀번호가 6자 미만인 경우 400 에러를 반환해야 함', async () => {
      const response = await request
        .default(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: testEmail,
          password: '12345',
          name: 'Test User',
        });

      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it('필수 필드가 누락된 경우 400 에러를 반환해야 함', async () => {
      const response = await request
        .default(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: testEmail,
          password: 'password123',
          // name 필드 누락
        });

      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it('이미 존재하는 이메일로 회원가입 시 409 에러를 반환해야 함', async () => {
      // 첫 번째 회원가입
      await request.default(app.getHttpServer()).post('/auth/register').send({
        email: testEmail,
        password: 'password123',
        name: 'Test User',
      });

      // 동일한 이메일로 두 번째 회원가입 시도
      const response = await request
        .default(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: testEmail,
          password: 'password456',
          name: 'Another User',
        });

      expect(response.status).toBe(409);
    });
  });

  describe('POST /auth/login', () => {
    const testUser = {
      email: 'login-test@example.com',
      password: 'password123',
      name: 'Login Test User',
    };

    beforeEach(async () => {
      // beforeAll → beforeEach로 변경
      // 테스트용 사용자 생성
      await request
        .default(app.getHttpServer())
        .post('/auth/register')
        .send(testUser);
    });

    it('로그인에 성공해야 함', () => {
      return request
        .default(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('access_token');
          expect(res.body).toHaveProperty('user');
          expect(res.body.user).toHaveProperty('id');
          expect(res.body.user).toHaveProperty('email', testUser.email);
          expect(res.body.user).toHaveProperty('name', testUser.name);
        });
    });

    it('존재하지 않는 이메일로 로그인 시 401 에러를 반환해야 함', async () => {
      const response = await request
        .default(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'password123',
        });

      expect(response.status).toBe(401);
    });

    it('잘못된 비밀번호로 로그인 시 401 에러를 반환해야 함', async () => {
      const response = await request
        .default(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: testUser.email,
          password: 'wrongpassword',
        });

      expect(response.status).toBe(401);
    });

    it('이메일 또는 비밀번호가 누락된 경우 400 에러를 반환해야 함', async () => {
      const response = await request
        .default(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: testUser.email,
          // password 누락
        });

      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe('POST /auth/kakao', () => {
    afterEach(async () => {
      // 카카오로 생성된 사용자 정리
      await prisma.user.deleteMany({
        where: {
          provider: 'kakao',
        },
      });
    });

    it('카카오 로그인에 성공해야 함', () => {
      return request
        .default(app.getHttpServer())
        .post('/auth/kakao')
        .send({
          id: '12345678',
          properties: {
            nickname: '카카오테스트',
          },
          kakao_account: {
            email: 'kakao@test.com',
          },
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('access_token');
          expect(res.body).toHaveProperty('user');
          expect(res.body.user).toHaveProperty('id');
          expect(res.body.user).toHaveProperty('provider', 'kakao');
        });
    });

    it('기존 카카오 사용자의 재로그인이 성공해야 함', async () => {
      const kakaoData = {
        id: '87654321',
        properties: {
          nickname: '기존카카오유저',
        },
        kakao_account: {
          email: 'existing-kakao@test.com',
        },
      };

      // 첫 번째 로그인
      await request
        .default(app.getHttpServer())
        .post('/auth/kakao')
        .send(kakaoData);

      // 두 번째 로그인 (재로그인)
      const response = await request
        .default(app.getHttpServer())
        .post('/auth/kakao')
        .send(kakaoData);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('access_token');
    });

    it('카카오 사용자 정보가 누락된 경우 400 에러를 반환해야 함', async () => {
      const response = await request
        .default(app.getHttpServer())
        .post('/auth/kakao')
        .send({
          // id 누락
          properties: {
            nickname: '테스트',
          },
        });

      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe('GET /auth/profile', () => {
    let authToken: string;
    const testUser = {
      email: 'profile-test@example.com',
      password: 'password123',
      name: 'Profile Test User',
    };

    beforeEach(async () => {
      // 테스트용 사용자 생성 및 로그인
      await request
        .default(app.getHttpServer())
        .post('/auth/register')
        .send(testUser);

      const loginResponse = await request
        .default(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        });

      authToken = loginResponse.body.access_token;
    });

    it('인증된 사용자의 프로필을 조회해야 함', () => {
      return request
        .default(app.getHttpServer())
        .get('/auth/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body).toHaveProperty('email', testUser.email);
          expect(res.body).toHaveProperty('name', testUser.name);
        });
    });

    it('인증 토큰 없이 접근 시 401 에러를 반환해야 함', () => {
      return request
        .default(app.getHttpServer())
        .get('/auth/profile')
        .expect(401);
    });

    it('잘못된 토큰으로 접근 시 401 에러를 반환해야 함', () => {
      return request
        .default(app.getHttpServer())
        .get('/auth/profile')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });
  });
});
