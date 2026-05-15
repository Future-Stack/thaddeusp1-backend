import { Controller, Get, Patch, Body, UseGuards } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { UpdateUserSettingsDto } from './dto/update-user-settings.dto';
import { UpdateAdminSettingsDto } from './dto/update-admin-settings.dto';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorator/roles.decorator';
import { GetCurrentUser } from 'src/common/decorator/get-current-user.decorator';

@ApiTags('Settings')
@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  // ── User Settings ──────────────────────────────────────────────────────────

  @Get('user')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get my notification & privacy settings' })
  getUserSettings(@GetCurrentUser('userId') userId: string) {
    return this.settingsService.getUserSettings(userId);
  }

  @Patch('user')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Update my notification & privacy settings' })
  updateUserSettings(
    @GetCurrentUser('userId') userId: string,
    @Body() dto: UpdateUserSettingsDto,
  ) {
    return this.settingsService.updateUserSettings(userId, dto);
  }

  // ── Admin Settings ─────────────────────────────────────────────────────────

  @Get('admin')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({
    summary: 'Get platform & notification settings (Admin only)',
    description: 'Retrieve global platform configurations including maintenance mode status and notification preferences.',
  })
  async getAdminSettings() {
    return this.settingsService.getAdminSettings();
  }

  @Patch('admin')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({
    summary: 'Update platform & notification settings (Admin only)',
    description: 'Update global platform configurations such as maintenance mode, automated draw settings, and email preferences.',
  })
  async updateAdminSettings(@Body() dto: UpdateAdminSettingsDto) {
    const settings = await this.settingsService.updateAdminSettings(dto);
    return {
      success: true,
      message: 'Admin settings updated successfully',
      data: settings,
    };
  }
}
