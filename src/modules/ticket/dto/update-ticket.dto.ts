import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsDateString } from 'class-validator';

export class UpdateTicketDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isWinner?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  winnerSelectedAt?: Date;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  prizeClaimed?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  prizeClaimedAt?: Date;
}
