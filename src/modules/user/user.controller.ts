import {
  Controller,
  Patch,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { UserService } from './user.service';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { GetCurrentUser } from 'src/common/decorator/get-current-user.decorator';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { FileInterceptor } from '@nestjs/platform-express';

@ApiTags('User')
@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Patch('profile')
  @ApiOperation({ summary: 'Update user profile with image upload' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('profileImg'))
  async updateProfile(
    @GetCurrentUser() user: any,
    @Body() data: UpdateProfileDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    const result = await this.userService.updateProfile(user.userId, data, file);
    return {
      success: true,
      message: 'Profile updated successfully',
      data: result,
    };
  }
}
