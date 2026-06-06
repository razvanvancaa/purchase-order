import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class RejectPoDto {
  @ApiProperty({ example: 'Amount exceeds budget' })
  @IsString()
  comment!: string;
}
