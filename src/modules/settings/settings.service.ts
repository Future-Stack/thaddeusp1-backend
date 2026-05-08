import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { UpdateUserSettingsDto } from './dto/update-user-settings.dto';
import { UpdateAdminSettingsDto } from './dto/update-admin-settings.dto';

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  // ── USER SETTINGS ──────────────────────────────────────────────────────────

  async getUserSettings(userId: string) {
    let settings = await this.prisma.userSettings.findUnique({ where: { userId } });
    if (!settings) {
      // Auto-create with defaults on first access
      settings = await this.prisma.userSettings.create({ data: { userId } });
    }
    return settings;
  }

  async updateUserSettings(userId: string, dto: UpdateUserSettingsDto) {
    return this.prisma.userSettings.upsert({
      where: { userId },
      update: dto,
      create: { userId, ...dto },
    });
  }

  // ── ADMIN SETTINGS (singleton) ─────────────────────────────────────────────

  async getAdminSettings() {
    let settings = await this.prisma.adminSettings.findFirst();
    if (!settings) {
      // Auto-create singleton with all defaults
      settings = await this.prisma.adminSettings.create({ data: {} });
    }
    return settings;
  }

  async updateAdminSettings(dto: UpdateAdminSettingsDto) {
    const existing = await this.prisma.adminSettings.findFirst();
    if (existing) {
      return this.prisma.adminSettings.update({
        where: { id: existing.id },
        data: dto,
      });
    }
    return this.prisma.adminSettings.create({ data: dto });
  }
}
