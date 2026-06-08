import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsPositive, IsUUID, IsOptional } from 'class-validator';

export class SetBudgetDto {
  @ApiProperty({ example: 'a1b2c3d4-...' })
  @IsUUID()
  userId!: string;

  @ApiProperty({ example: 15000 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  annual_limit!: number;

  @ApiPropertyOptional({ example: 2026 })
  @IsOptional()
  @IsNumber()
  year?: number;
}
