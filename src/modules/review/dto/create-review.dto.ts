import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class CreateReviewDto {
  @ApiProperty({ example: 'Great platform! I won my first draw today.' })
  @IsNotEmpty()
  @IsString()
  @MinLength(5)
  text: string;
}
