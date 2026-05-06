import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { UserSignUpDto } from './dto/user.singup.dto';
import { ERROR_MESSAGES } from 'src/common/constants';
import * as bcrypt from 'bcrypt';
import { LoginDto } from './dto/login.dto';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { IEnv } from 'src/config/env.config';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) { }

  async hast(text: string) {
    const hash = await bcrypt.hash(text, 10);

    return hash;
  }

  async userSignUp(data: UserSignUpDto) {
    const user = await this.prisma.user.findUnique({
      where: {
        email: data.email,
      },
    });

    // const checkPhone = await this.prisma.user.findFirst({
    //   where: {
    //     phone: data.phone,
    //   },
    // });

    if (user)
      throw new BadRequestException(ERROR_MESSAGES.USER.USER_ALREADY_EXISTS);
    // if (checkPhone)
    //   throw new BadRequestException(ERROR_MESSAGES.USER.PHONE_ALREADY_EXISTS);

    const hastPassword = await this.hast(data.password);

    const create = await this.prisma.user.create({
      data: {
        fullName: data.fullName,
        email: data.email,
        // phone: data.phone,
        password: hastPassword,
        regionId: data.regionId,
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        profileImg: true,
        role: true,
        region: true,
      },
    });

    return create;
  }

  async signIn(data: LoginDto) {
    const { email, password } = data;

    // 1. Find user
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // 2. Check account status
    if (user.status === 'suspended') {
      throw new ForbiddenException('Account suspended');
    }

    // 3. Validate password
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      throw new NotFoundException(ERROR_MESSAGES.AUTH.INVALID_PASSWORD);
    }

    // 4. Generate tokens
    const tokens = await this.generateTokens(user.id, user.email);
    const hashedRefreshToken = await bcrypt.hash(tokens.refreshToken, 10);

    // 5. Update refresh token + last login in ONE query (optimized)
    // const updatedUser = 
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        refreshToken: hashedRefreshToken,
        lastLoggedin: new Date(),
      },
    });

    // 6. Remove sensitive fields before returning
    // const { password: _, refreshToken: __, lastOtp, ...rest } = updatedUser;

    return {
      message: 'Login successful',
      tokens,
      // user: rest,
    };
  }

  async findUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: {
        id: userId,
      },
      include: {
        region: true,
      },
    });
    if (!user) throw new NotFoundException(ERROR_MESSAGES.USER.USER_NOT_FOUND);

    const { password, lastOtp, refreshToken, ...rest } = user;

    return rest;
  }

  async generateTokens(userId: string, email: string) {
    const env = this.configService.get<IEnv>('env');
    const payload = { sub: userId, email };

    const accessToken = await this.jwtService.signAsync(payload, {
      secret: env?.JWT_CONFIG.JWT_SECRET,
      expiresIn: '7d',
    });

    const refreshToken = await this.jwtService.signAsync(payload, {
      secret: env?.JWT_CONFIG.JWT_REFRESH_SECRET,
      expiresIn: '30d',
    });

    return {
      accessToken,
      refreshToken,
    };
  }

  async updateRefreshToken(userId: string, refreshToken: string) {
    const hashed = await bcrypt.hash(refreshToken, 10);

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        refreshToken: hashed,
      },
    });
  }

  async refreshToken(userId: string, refreshToken: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.refreshToken) {
      throw new ForbiddenException('Access denied');
    }

    const isMatch = await bcrypt.compare(refreshToken, user.refreshToken);

    if (!isMatch) {
      throw new ForbiddenException('Access denied');
    }

    const tokens = await this.generateTokens(user.id, user.email);

    await this.updateRefreshToken(user.id, tokens.refreshToken);

    return tokens;
  }

  async logout(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        refreshToken: null,
      },
    });

    return {
      message: 'Logout successful',
    };
  }

  async changePassword(userId: string, data: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) throw new NotFoundException(ERROR_MESSAGES.USER.USER_NOT_FOUND);

    const isPasswordValid = await bcrypt.compare(data.oldPassword, user.password);
    if (!isPasswordValid) throw new BadRequestException('Invalid old password');

    const newHashedPassword = await this.hast(data.newPassword);

    await this.prisma.user.update({
      where: { id: userId },
      data: { password: newHashedPassword, passwordChangedAt: new Date() },
    });

    return { message: 'Password changed successfully' };
  }

  async forgotPassword(data: ForgotPasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: data.email },
    });

    if (!user) throw new NotFoundException(ERROR_MESSAGES.USER.USER_NOT_FOUND);

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiredAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastOtp: otp, otpExpiredAt },
    });

    // TODO: Send Email with OTP (logging for now)
    console.log(`OTP for ${data.email} is ${otp}`);

    return { message: 'OTP sent to your email successfully' };
  }

  async resetPassword(data: ResetPasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: data.email },
    });

    if (!user) throw new NotFoundException(ERROR_MESSAGES.USER.USER_NOT_FOUND);

    if (user.lastOtp !== data.otp) throw new BadRequestException('Invalid OTP');
    
    if (user.otpExpiredAt && user.otpExpiredAt < new Date()) {
      throw new BadRequestException('OTP has expired');
    }

    const newHashedPassword = await this.hast(data.newPassword);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        password: newHashedPassword,
        lastOtp: null,
        otpExpiredAt: null,
        passwordChangedAt: new Date(),
      },
    });

    return { message: 'Password reset successfully' };
  }
}
