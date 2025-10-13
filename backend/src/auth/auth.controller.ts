import {
  Controller,
  Post,
  Body,
  UseGuards,
  Get,
  Request,
  Req,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { CloudWatchLogger } from '../utils/cloudwatch-logger';

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private cloudWatchLogger: CloudWatchLogger,
  ) {}

  @Post('register')
  async register(@Body() registerDto: RegisterDto, @Req() req: any) {
    const startTime = Date.now();

    try {
      // 특정 에러 체크: 이메일 형식 검증
      if (!registerDto.email || !registerDto.email.includes('@')) {
        const responseTime = Date.now() - startTime;
        await this.cloudWatchLogger.sendLog(
          400,
          'POST',
          '/auth/register',
          req.ip || '0.0.0.0',
          registerDto.email || '익명',
          req.headers['user-agent'] || 'Unknown',
          responseTime,
          '회원가입 실패 - 잘못된 이메일 형식',
        );
        throw new Error('올바른 이메일 형식이 아닙니다');
      }

      // 비밀번호 길이 검증
      if (!registerDto.password || registerDto.password.length < 6) {
        const responseTime = Date.now() - startTime;
        await this.cloudWatchLogger.sendLog(
          400,
          'POST',
          '/auth/register',
          req.ip || '0.0.0.0',
          registerDto.email || '익명',
          req.headers['user-agent'] || 'Unknown',
          responseTime,
          '회원가입 실패 - 비밀번호가 너무 짧음 (6자 이상 필요)',
        );
        throw new Error('비밀번호는 6자 이상이어야 합니다');
      }

      const result = await this.authService.register(registerDto);
      const responseTime = Date.now() - startTime;

      await this.cloudWatchLogger.sendLog(
        201,
        'POST',
        '/auth/register',
        req.ip || '0.0.0.0',
        registerDto.email,
        req.headers['user-agent'] || 'Unknown',
        responseTime,
        '회원가입 성공',
      );

      return result;
    } catch (error) {
      const responseTime = Date.now() - startTime;

      // 이메일 중복 에러
      if (
        error.message?.includes('duplicate') ||
        error.message?.includes('unique')
      ) {
        await this.cloudWatchLogger.sendLog(
          409,
          'POST',
          '/auth/register',
          req.ip || '0.0.0.0',
          registerDto.email || '익명',
          req.headers['user-agent'] || 'Unknown',
          responseTime,
          `회원가입 실패 - 이미 존재하는 이메일 (${error.message})`,
        );
      }
      // 데이터베이스 연결 오류
      else if (
        error.message?.includes('connection') ||
        error.message?.includes('timeout')
      ) {
        await this.cloudWatchLogger.sendLog(
          503,
          'POST',
          '/auth/register',
          req.ip || '0.0.0.0',
          registerDto.email || '익명',
          req.headers['user-agent'] || 'Unknown',
          responseTime,
          `회원가입 실패 - 데이터베이스 연결 오류 (${error.message})`,
        );
      }
      // 일반 에러
      else {
        await this.cloudWatchLogger.sendLog(
          500,
          'POST',
          '/auth/register',
          req.ip || '0.0.0.0',
          registerDto.email || '익명',
          req.headers['user-agent'] || 'Unknown',
          responseTime,
          `회원가입 실패 - 서버 오류 (${error.message})`,
        );
      }

      throw error;
    }
  }

  @Post('login')
  async login(@Body() loginDto: LoginDto, @Req() req: any) {
    const startTime = Date.now();

    try {
      // 로그인 데이터 검증
      if (!loginDto.email || !loginDto.password) {
        const responseTime = Date.now() - startTime;
        await this.cloudWatchLogger.sendLog(
          400,
          'POST',
          '/auth/login',
          req.ip || '0.0.0.0',
          loginDto.email || '익명',
          req.headers['user-agent'] || 'Unknown',
          responseTime,
          '로그인 실패 - 이메일 또는 비밀번호 누락',
        );
        throw new Error('이메일과 비밀번호를 입력해주세요');
      }

      const result = await this.authService.login(loginDto);
      const responseTime = Date.now() - startTime;

      await this.cloudWatchLogger.sendLog(
        200,
        'POST',
        '/auth/login',
        req.ip || '0.0.0.0',
        loginDto.email,
        req.headers['user-agent'] || 'Unknown',
        responseTime,
        '로그인 성공',
      );

      return result;
    } catch (error) {
      const responseTime = Date.now() - startTime;

      // 잘못된 자격증명
      if (
        error.message?.includes('invalid') ||
        error.message?.includes('wrong') ||
        error.message?.includes('incorrect')
      ) {
        await this.cloudWatchLogger.sendLog(
          401,
          'POST',
          '/auth/login',
          req.ip || '0.0.0.0',
          loginDto.email || '익명',
          req.headers['user-agent'] || 'Unknown',
          responseTime,
          `로그인 실패 - 잘못된 이메일 또는 비밀번호 (${error.message})`,
        );
      }
      // 사용자 없음
      else if (
        error.message?.includes('not found') ||
        error.message?.includes('user')
      ) {
        await this.cloudWatchLogger.sendLog(
          404,
          'POST',
          '/auth/login',
          req.ip || '0.0.0.0',
          loginDto.email || '익명',
          req.headers['user-agent'] || 'Unknown',
          responseTime,
          `로그인 실패 - 존재하지 않는 사용자 (${error.message})`,
        );
      }
      // 계정 잠김/비활성화
      else if (
        error.message?.includes('locked') ||
        error.message?.includes('disabled')
      ) {
        await this.cloudWatchLogger.sendLog(
          423,
          'POST',
          '/auth/login',
          req.ip || '0.0.0.0',
          loginDto.email || '익명',
          req.headers['user-agent'] || 'Unknown',
          responseTime,
          `로그인 실패 - 계정 잠김 또는 비활성화 (${error.message})`,
        );
      }
      // 일반 에러
      else {
        await this.cloudWatchLogger.sendLog(
          500,
          'POST',
          '/auth/login',
          req.ip || '0.0.0.0',
          loginDto.email || '익명',
          req.headers['user-agent'] || 'Unknown',
          responseTime,
          `로그인 실패 - 서버 오류 (${error.message})`,
        );
      }

      throw error;
    }
  }

  @Post('kakao')
  async kakaoLogin(@Body() kakaoData: any, @Req() req: any) {
    const startTime = Date.now();

    try {
      // 카카오 데이터 검증
      if (!kakaoData || !kakaoData.id) {
        const responseTime = Date.now() - startTime;
        await this.cloudWatchLogger.sendLog(
          400,
          'POST',
          '/auth/kakao',
          req.ip || '0.0.0.0',
          kakaoData?.email || '카카오사용자',
          req.headers['user-agent'] || 'Unknown',
          responseTime,
          '카카오 로그인 실패 - 카카오 사용자 정보 누락',
        );
        throw new Error('카카오 사용자 정보가 누락되었습니다');
      }

      const result = await this.authService.kakaoLogin(kakaoData);
      const responseTime = Date.now() - startTime;

      await this.cloudWatchLogger.sendLog(
        200,
        'POST',
        '/auth/kakao',
        req.ip || '0.0.0.0',
        kakaoData.email || kakaoData.nickname || '카카오사용자',
        req.headers['user-agent'] || 'Unknown',
        responseTime,
        '카카오 로그인 성공',
      );

      return result;
    } catch (error) {
      const responseTime = Date.now() - startTime;

      // 카카오 API 오류
      if (
        error.message?.includes('kakao') ||
        error.message?.includes('oauth')
      ) {
        await this.cloudWatchLogger.sendLog(
          502,
          'POST',
          '/auth/kakao',
          req.ip || '0.0.0.0',
          kakaoData?.email || '카카오사용자',
          req.headers['user-agent'] || 'Unknown',
          responseTime,
          `카카오 로그인 실패 - 카카오 API 오류 (${error.message})`,
        );
      }
      // 토큰 관련 오류
      else if (
        error.message?.includes('token') ||
        error.message?.includes('expired')
      ) {
        await this.cloudWatchLogger.sendLog(
          401,
          'POST',
          '/auth/kakao',
          req.ip || '0.0.0.0',
          kakaoData?.email || '카카오사용자',
          req.headers['user-agent'] || 'Unknown',
          responseTime,
          `카카오 로그인 실패 - 토큰 오류 (${error.message})`,
        );
      }
      // 일반 에러
      else {
        await this.cloudWatchLogger.sendLog(
          500,
          'POST',
          '/auth/kakao',
          req.ip || '0.0.0.0',
          kakaoData?.email || '카카오사용자',
          req.headers['user-agent'] || 'Unknown',
          responseTime,
          `카카오 로그인 실패 - 서버 오류 (${error.message})`,
        );
      }

      throw error;
    }
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('profile')
  async getProfile(@Request() req, @Req() request: any) {
    const startTime = Date.now();

    try {
      // JWT 가드를 통과했지만 사용자 정보가 없는 경우
      if (!req.user) {
        const responseTime = Date.now() - startTime;
        await this.cloudWatchLogger.sendLog(
          401,
          'GET',
          '/auth/profile',
          request.ip || '0.0.0.0',
          '인증 실패',
          request.headers['user-agent'] || 'Unknown',
          responseTime,
          '프로필 조회 실패 - JWT는 유효하지만 사용자 정보 없음',
        );
        throw new Error('사용자 정보를 찾을 수 없습니다');
      }

      const result = req.user;
      const responseTime = Date.now() - startTime;

      await this.cloudWatchLogger.sendLog(
        200,
        'GET',
        '/auth/profile',
        request.ip || '0.0.0.0',
        req.user?.name || req.user?.email || '인증된 사용자',
        request.headers['user-agent'] || 'Unknown',
        responseTime,
        `프로필 조회 성공 (사용자: ${req.user?.email})`,
      );

      return result;
    } catch (error) {
      const responseTime = Date.now() - startTime;

      // JWT 관련 에러
      if (error.message?.includes('jwt') || error.message?.includes('token')) {
        await this.cloudWatchLogger.sendLog(
          401,
          'GET',
          '/auth/profile',
          request.ip || '0.0.0.0',
          '토큰 오류',
          request.headers['user-agent'] || 'Unknown',
          responseTime,
          `프로필 조회 실패 - JWT 토큰 오류 (${error.message})`,
        );
      }
      // 세션 만료
      else if (
        error.message?.includes('session') ||
        error.message?.includes('expired')
      ) {
        await this.cloudWatchLogger.sendLog(
          401,
          'GET',
          '/auth/profile',
          request.ip || '0.0.0.0',
          '세션 만료',
          request.headers['user-agent'] || 'Unknown',
          responseTime,
          `프로필 조회 실패 - 세션 만료 (${error.message})`,
        );
      }
      // 일반 에러
      else {
        await this.cloudWatchLogger.sendLog(
          500,
          'GET',
          '/auth/profile',
          request.ip || '0.0.0.0',
          req.user?.name || '인증된 사용자',
          request.headers['user-agent'] || 'Unknown',
          responseTime,
          `프로필 조회 실패 - 서버 오류 (${error.message})`,
        );
      }

      throw error;
    }
  }
}
