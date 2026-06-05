import { IsOptional, IsString } from 'class-validator';

export class RejectPoDto {
    @IsString()
    comment!: string;
}