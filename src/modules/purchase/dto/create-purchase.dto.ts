import { IsInt, IsNotEmpty, IsString, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreatePurchaseDto {
  @ApiProperty({ example: 'event-uuid', description: 'The ID of the event' })
  @IsString()
  @IsNotEmpty()
  eventId: string;

  @ApiProperty({ example: 2, description: 'Number of tickets to purchase' })
  @IsInt()
  @Min(1)
  quantity: number;
}
