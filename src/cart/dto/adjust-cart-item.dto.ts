import { IsInt, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AdjustCartItemDto {
    @ApiProperty({
        example: 2,
        minimum: 0,
        description: 'Set to 0 to remove the item from the cart',
    })
    @IsInt()
    @Min(0)
    quantity: number;
}
