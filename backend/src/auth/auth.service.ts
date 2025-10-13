import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import * as bcrypt from 'bcrypt';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { randomUUID } from 'crypto'; // uuid 대신 crypto 사용

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async register(registerDto: RegisterDto) {
    const { email, password, name } = registerDto;

    const existingUser = await this.usersService.findByEmail(email);
    if (existingUser) {
      throw new ConflictException('이미 존재하는 이메일입니다');
    }

    const user = await this.usersService.create(email, password, name);
    const { password: _, ...result } = user;
    return result;
  }

  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;

    const user = await this.usersService.findByEmail(email);
    if (!user || !user.password) {
      throw new UnauthorizedException('잘못된 이메일 또는 비밀번호입니다');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('잘못된 이메일 또는 비밀번호입니다');
    }

    // 새로운 세션 ID 생성 및 업데이트
    const sessionId = randomUUID(); // v4 uuid와 동일한 기능
    await this.usersService.updateActiveSession(user.id, sessionId);

    const payload = {
      sub: user.id,
      email: user.email,
      sessionId: sessionId, // 세션 ID 추가
    };
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    };
  }

  async kakaoLogin(kakaoProfile: any) {
    const { id: kakaoId, properties, kakao_account } = kakaoProfile;
    const email = kakao_account?.email || `kakao_${kakaoId}@kakao.local`;
    const name = properties?.nickname || '카카오 사용자';

    let user = await this.usersService.findByKakaoId(kakaoId);

    if (!user) {
      user = await this.usersService.createKakaoUser(email, name, kakaoId);
    }

    // 새로운 세션 ID 생성 및 업데이트
    const sessionId = randomUUID(); // v4 uuid와 동일한 기능
    await this.usersService.updateActiveSession(user.id, sessionId);

    const payload = {
      sub: user.id,
      email: user.email,
      sessionId: sessionId, // 세션 ID 추가
    };
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        provider: user.provider,
      },
    };
  }

  async validateUser(userId: string) {
    return this.usersService.findById(userId);
  }

  // 세션 유효성 검사 (새로 추가)
  async validateSession(userId: string, sessionId: string): Promise<boolean> {
    const user = await this.usersService.findById(userId);
    return user?.activeSessionId === sessionId;
  }
}
