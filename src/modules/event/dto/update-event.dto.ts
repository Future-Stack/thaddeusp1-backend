import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { CreateEventDto } from './create-event.dto';
import { EventStatus } from '@prisma/client';
import { IsEnum, IsOptional } from 'class-validator';

export class UpdateEventDto extends PartialType(CreateEventDto) {
  @ApiPropertyOptional({ enum: EventStatus, example: EventStatus.ONGOING })
  @IsOptional()
  @IsEnum(EventStatus)
  status?: EventStatus;
}
