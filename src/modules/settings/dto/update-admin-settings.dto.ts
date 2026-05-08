import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsBoolean, IsInt, IsString, Min } from 'class-validator';

export class UpdateAdminSettingsDto {
  // Platform
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  maintenanceMode?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  automatedDraws?: boolean;

  @ApiPropertyOptional({ description: 'e.g. MONDAY, TUESDAY' })
  @IsOptional()
  @IsString()
  drawDay?: string;

  @ApiPropertyOptional({ description: 'e.g. 18:00' })
  @IsOptional()
  @IsString()
  drawTime?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  maxTicketPerUser?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  minTicketForDraw?: number;

  // Notification settings
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  emailWinners?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  emailAllParticipants?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  smsWinnerNotifications?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  adminDrawAlerts?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  lowParticipationAlert?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  lowParticipationThreshold?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  marketingEmailsToUsers?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  drawReminders?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  autoSendVouchers?: boolean;
}
