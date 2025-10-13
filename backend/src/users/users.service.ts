import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async create(email: string, password: string, name: string) {
    const hashedPassword = await bcrypt.hash(password, 10);
    return this.prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        provider: 'email',
      },
    });
  }

  // 카카오 회원 생성 (새로 추가)
  async createKakaoUser(email: string, name: string, providerId: string) {
    return this.prisma.user.create({
      data: {
        email,
        name,
        provider: 'kakao',
        providerId,
        password: null, // 카카오 로그인은 비밀번호 없음
      },
    });
  }

  // 카카오 ID로 회원 찾기 (새로 추가)
  async findByKakaoId(providerId: string) {
    return this.prisma.user.findFirst({
      where: {
        provider: 'kakao',
        providerId,
      },
    });
  }

  // 이메일과 provider로 회원 찾기 (새로 추가)
  async findByEmailAndProvider(email: string, provider: string) {
    return this.prisma.user.findFirst({
      where: {
        email,
        provider,
      },
    });
  }

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  async findById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
    });
  }

  // 활성 세션 업데이트 (새로 추가)
  async updateActiveSession(userId: string, sessionId: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { activeSessionId: sessionId },
    });
  }
}
