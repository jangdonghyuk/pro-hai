import { IsEmail, IsString, MinLength } from 'class-validator';

export class RegisterDto {
  @IsEmail({}, { message: '올바른 이메일 형식을 입력해주세요' })
  email: string;

  @IsString({ message: '비밀번호를 입력해주세요' })
  @MinLength(6, { message: '비밀번호는 최소 6자 이상이어야 합니다' })
  password: string;

  @IsString({ message: '이름을 입력해주세요' })
  name: string;
}
