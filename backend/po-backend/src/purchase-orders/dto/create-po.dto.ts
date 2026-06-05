import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString } from "class-validator";
import { POCategory } from "../purchase-order.entity";

export class CreatePoDto {
    @IsString()
    @IsNotEmpty()
    title!: string;

    @IsString()
    @IsOptional()
    description?: string;

    @IsNumber()
    @IsPositive()
    amount!: number;

    @IsEnum(POCategory)
    category!: POCategory;
}