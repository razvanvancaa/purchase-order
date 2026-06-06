import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString } from 'class-validator';
import { POCategory } from '../purchase-order.entity';

export class CreatePoDto {
  @ApiProperty({ example: 'Office chairs' })
  @IsString()
  @IsNotEmpty()
  title!: string;

  @ApiPropertyOptional({ example: '10 ergonomic chairs for the dev team' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ example: 1500.00 })
  @IsNumber()
  @IsPositive()
  amount!: number;

  @ApiProperty({ enum: POCategory, example: POCategory.OFFICE_SUPPLIES })
  @IsEnum(POCategory)
  category!: POCategory;
}
