import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { CloudWatchLogger } from './../src/utils/cloudwatch-logger';

// Mock CloudWatchLogger
const mockCloudWatchLogger = {
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
  verbose: jest.fn(),
  sendToCloudWatch: jest.fn(),
  onModuleDestroy: jest.fn(),
};

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(CloudWatchLogger)
      .useValue(mockCloudWatchLogger)
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('/ (GET)', () => {
    return request
      .default(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect('Hello World!');
  });
});
