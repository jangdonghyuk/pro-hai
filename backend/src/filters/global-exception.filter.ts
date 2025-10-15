import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { CloudWatchLogger } from '../utils/cloudwatch-logger';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  constructor(private readonly cloudWatchLogger: CloudWatchLogger) {}

  async catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';

    // HTTP 예외 처리
    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (
        typeof exceptionResponse === 'object' &&
        exceptionResponse !== null
      ) {
        message = (exceptionResponse as any).message || 'Unknown error';
        if (Array.isArray(message)) {
          message = message.join(', ');
        }
      }
    } else if (exception instanceof Error) {
      message = exception.message;
    }

    // CloudWatch 로깅 (모든 예외)
    await this.cloudWatchLogger.sendLog(
      status,
      request.method,
      request.url,
      request.ip || '0.0.0.0',
      '예외처리',
      request.headers['user-agent'] || 'Unknown',
      Date.now() - ((request as any).startTime || Date.now()),
      `글로벌 예외 처리 - ${message}`,
    );

    // 응답 전송
    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message: message,
    });
  }
}
