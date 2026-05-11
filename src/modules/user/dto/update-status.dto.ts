import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty } from 'class-validator';

export class UpdateStatusDto {
  @ApiProperty({ enum: ['active', 'inActive'] })
  @IsNotEmpty()
  @IsEnum(['active', 'inActive'])
  status: 'active' | 'inActive';
}

export class AdminUpdateStatusDto {
  @ApiProperty({ enum: ['active', 'suspended'] })
  @IsNotEmpty()
  @IsEnum(['active', 'suspended'])
  status: 'active' | 'suspended';
}
