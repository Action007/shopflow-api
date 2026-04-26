import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class PlaceOrderDto {
    @ApiProperty({
        example: '221B Baker Street, London, NW1 6XE',
    })
    @IsString()
    @IsNotEmpty()
    shippingAddress: string;
}
