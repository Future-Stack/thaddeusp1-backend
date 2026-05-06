import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CreateRegionDto {
  @ApiProperty({ example: 'North America' })
  @IsNotEmpty()
  @IsString()
  name: string;
}
