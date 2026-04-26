import { IsUUID, IsInt, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AddToCartDto {
    @ApiProperty({ format: 'uuid' })
    @IsUUID()
    productId: string;

    @ApiProperty({ example: 1, minimum: 1 })
    @IsInt()
    @Min(1)
    quantity: number;
}
