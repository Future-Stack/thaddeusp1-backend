import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsNumber,
  IsUUID,
  IsDateString,
  IsBoolean,
} from 'class-validator';

export class CreateEventDto {
  @ApiProperty({ example: 'Summer Lucky Draw' })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: 'Big prizes for everyone' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 'uuid-of-region' })
  @IsNotEmpty()
  @IsUUID()
  regionId: string;

  @ApiProperty({ example: '2026-06-01T10:00:00Z' })
  @IsNotEmpty()
  @IsDateString()
  drawDate: string;

  @ApiProperty({ example: '2026-05-01T10:00:00Z' })
  @IsNotEmpty()
  @IsDateString()
  ticketOpen: string;

  @ApiProperty({ example: '2026-05-31T23:59:59Z' })
  @IsNotEmpty()
  @IsDateString()
  ticketClose: string;

  @ApiProperty({ example: 10.0 })
  @IsNotEmpty()
  @IsNumber()
  ticketPrice: number;

  @ApiProperty({ example: 1000.0 })
  @IsNotEmpty()
  @IsNumber()
  prizeValue: number;

  @ApiProperty({ example: 500 })
  @IsNotEmpty()
  @IsNumber()
  maxTickets: number;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  isAutoDraw?: boolean;
}
