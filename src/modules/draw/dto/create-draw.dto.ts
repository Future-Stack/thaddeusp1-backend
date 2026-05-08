import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsEnum, IsOptional } from 'class-validator';
import { DrawMethod } from '@prisma/client';

export class CreateDrawDto {
  @ApiProperty()
  @IsString()
  eventId: string;

  @ApiPropertyOptional({ enum: DrawMethod, default: DrawMethod.RANDOM })
  @IsOptional()
  @IsEnum(DrawMethod)
  method?: DrawMethod;
}
