import {
  Controller,
  Patch,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Get,
  Query,
  Param,
} from '@nestjs/common';
import { UserService } from './user.service';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { GetCurrentUser } from 'src/common/decorator/get-current-user.decorator';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorator/roles.decorator';
import { AdminUpdateStatusDto, UpdateStatusDto } from './dto/update-status.dto';

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

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Patch('status')
  @ApiOperation({ summary: 'Update own status (active/inActive)' })
  async updateStatus(@GetCurrentUser('userId') userId: string, @Body() dto: UpdateStatusDto) {
    return this.userService.updateStatus(userId, dto.status);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Patch('admin/:id/status')
  @ApiOperation({ summary: 'Update any user status (active/suspended) - Admin only' })
  async adminUpdateStatus(@Param('id') id: string, @Body() dto: AdminUpdateStatusDto) {
    return this.userService.adminUpdateStatus(id, dto.status);
  }

  @Get('admin/list')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Get detailed list of users with purchase info (Admin only)' })
  @ApiQuery({ name: 'searchTerm', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  getUserList(
    @Query('searchTerm') searchTerm?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.userService.getUserList({ searchTerm, page, limit });
  }

  @Get('admin/stats')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Get global user stats (Admin only)' })
  getGlobalStats() {
    return this.userService.getGlobalUserStats();
  }
}
