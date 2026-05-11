import { Controller, Get, Patch, Body, UseGuards } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { UpdateUserSettingsDto } from './dto/update-user-settings.dto';
import { UpdateAdminSettingsDto } from './dto/update-admin-settings.dto';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { AdminGuard } from 'src/common/guards/admin.guard';
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
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiOperation({ summary: 'Get platform & notification settings (Admin only)' })
  getAdminSettings() {
    return this.settingsService.getAdminSettings();
  }

  @Patch('admin')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiOperation({ summary: 'Update platform & notification settings (Admin only)' })
  updateAdminSettings(@Body() dto: UpdateAdminSettingsDto) {
    return this.settingsService.updateAdminSettings(dto);
  }
}
