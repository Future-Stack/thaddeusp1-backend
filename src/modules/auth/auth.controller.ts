import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserSignUpDto } from './dto/user.singup.dto';
import { SUCCESS_MESSAGES } from 'src/common/constants';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh.token.dto';
import { GetCurrentUser } from 'src/common/decorator/get-current-user.decorator';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { GoogleLoginDto } from './dto/google-login.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // @UseGuards(JwtAuthGuard, RolesGuard)
  // @Roles("ELEVATOR")
  // @Get("elevator-data")
  // getElevatorData() {
  //   return "Only elevator";
  // }

  @Post('sign-up')
  @ApiOperation({ summary: 'User SignUp (Only Can User)' })
  async userSignUp(@Body() data: UserSignUpDto) {
    const result = await this.authService.userSignUp(data);

    return {
      success: true,
      message: SUCCESS_MESSAGES.AUTH.REGISTRATION_SUCCESS,
      data: result,
    };
  }

  @Post('login')
  @ApiOperation({ summary: 'User, Elevetor & Admin Login' })
  async signIn(@Body() data: LoginDto) {
    const result = await this.authService.signIn(data);

    return {
      success: true,
      result,
    };
  }

  @Post('google-login')
  @ApiOperation({ summary: 'Google Login (Social Authentication)' })
  async googleLogin(@Body() data: GoogleLoginDto) {
    const result = await this.authService.googleSignIn(data);

    return {
      success: true,
      result,
    };
  }

  @Post('refresh-token')
  async refreshToken(@Body() body: RefreshTokenDto) {
    const { userId, refreshToken } = body;

    const result = await this.authService.refreshToken(userId, refreshToken);

    return {
      success: true,
      message: 'Token refreshed successfully',
      data: result,
    };
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getMe(@GetCurrentUser() user: any) {
    const userId = user?.userId;

    const result = await this.authService.findUser(userId);

    return {
      success: true,
      user: result,
    };
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('change-password')
  @ApiOperation({ summary: 'Change Password' })
  async changePassword(
    @GetCurrentUser() user: any,
    @Body() data: ChangePasswordDto,
  ) {
    const result = await this.authService.changePassword(user.userId, data);
    return { success: true, ...result };
  }

  @Post('forgot-password')
  @ApiOperation({ summary: 'Request OTP to reset password' })
  async forgotPassword(@Body() data: ForgotPasswordDto) {
    const result = await this.authService.forgotPassword(data);
    return { success: true, ...result };
  }

  @Post('reset-password')
  @ApiOperation({ summary: 'Verify OTP and Reset Password' })
  async resetPassword(@Body() data: ResetPasswordDto) {
    const result = await this.authService.resetPassword(data);
    return { success: true, ...result };
  }
}
