import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsBoolean } from 'class-validator';

export class UpdateUserSettingsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  drawReminder?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  winnerAnnouncement?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  marketingEmails?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  weeklyDigest?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  voucherExpiryAlert?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  showOnWinnersList?: boolean;
}
