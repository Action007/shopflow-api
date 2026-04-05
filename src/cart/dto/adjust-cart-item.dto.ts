import { IsInt, Min } from 'class-validator';

export class AdjustCartItemDto {
    @IsInt()
    @Min(0)
    quantity: number;
}