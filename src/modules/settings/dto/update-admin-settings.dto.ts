import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsBoolean, IsInt, IsString, Min, ValidateIf, IsNotEmpty } from 'class-validator';

export class UpdateAdminSettingsDto {
  // ── Platform Settings ──────────────────────────────────────────────────────

  @ApiPropertyOptional({
    description: 'Enable maintenance mode to restrict user access',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  maintenanceMode?: boolean;

  @ApiPropertyOptional({
    description: 'Enable or disable automated draws across the platform',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  automatedDraws?: boolean;

  @ApiPropertyOptional({
    description: 'Day of the week for automated draws (e.g., MONDAY, TUESDAY). Required if automatedDraws is true.',
    example: 'MONDAY',
  })
  @ValidateIf((o) => o.automatedDraws === true)
  @IsNotEmpty({ message: 'drawDay is required when automatedDraws is true' })
  @IsString()
  drawDay?: string;

  @ApiPropertyOptional({
    description: 'Time of the day for automated draws in 24h format (e.g., 18:00). Required if automatedDraws is true.',
    example: '18:00',
  })
  @ValidateIf((o) => o.automatedDraws === true)
  @IsNotEmpty({ message: 'drawTime is required when automatedDraws is true' })
  @IsString()
  drawTime?: string;

  @ApiPropertyOptional({
    description: 'Maximum number of tickets a single user can hold for a draw. Required if automatedDraws is true.',
    example: 10,
  })
  @ValidateIf((o) => o.automatedDraws === true)
  @IsNotEmpty({ message: 'maxTicketPerUser is required when automatedDraws is true' })
  @IsInt()
  @Min(1)
  maxTicketPerUser?: number;

  @ApiPropertyOptional({
    description: 'Minimum number of tickets required in a draw to trigger it. Required if automatedDraws is true.',
    example: 1,
  })
  @ValidateIf((o) => o.automatedDraws === true)
  @IsNotEmpty({ message: 'minTicketForDraw is required when automatedDraws is true' })
  @IsInt()
  @Min(1)
  minTicketForDraw?: number;

  // ── Notification Settings ──────────────────────────────────────────────────

  @ApiPropertyOptional({
    description: 'Send email notifications to winners',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  emailWinners?: boolean;

  @ApiPropertyOptional({
    description: 'Send email notifications to all participants after a draw',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  emailAllParticipants?: boolean;

  @ApiPropertyOptional({
    description: 'Send SMS notifications to winners',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  smsWinnerNotifications?: boolean;

  @ApiPropertyOptional({
    description: 'Send alerts to admins when a draw occurs',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  adminDrawAlerts?: boolean;

  @ApiPropertyOptional({
    description: 'Alert admins if participation is low',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  lowParticipationAlert?: boolean;

  @ApiPropertyOptional({
    description: 'Threshold for low participation alerts',
    example: 10,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  lowParticipationThreshold?: number;

  @ApiPropertyOptional({
    description: 'Allow sending marketing emails to users',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  marketingEmailsToUsers?: boolean;

  @ApiPropertyOptional({
    description: 'Send draw reminders to participants',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  drawReminders?: boolean;

  @ApiPropertyOptional({
    description: 'Automatically send vouchers to winners after draw',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  autoSendVouchers?: boolean;
}

