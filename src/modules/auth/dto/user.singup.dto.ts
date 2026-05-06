import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class UserSignUpDto {
  @ApiProperty({ example: 'user' })
  @IsNotEmpty()
  @IsString()
  fullName: string;

  @ApiProperty({ example: 'user@gmail.com' })
  @IsNotEmpty()
  @IsString()
  @IsEmail()
  email: string;

  // @ApiProperty({ example: '' })
  // @IsNotEmpty()
  // @IsString()
  // phone: string;

  @ApiProperty({ example: '12345678' })
  @IsNotEmpty()
  @IsString()
  password: string;

  @ApiProperty({ example: 'uuid-of-region', required: false })
  @IsOptional()
  @IsString()
  regionId?: string;
}
