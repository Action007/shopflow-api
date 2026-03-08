import { IsNotEmpty, IsString } from 'class-validator';

export class PlaceOrderDto {
    @IsString()
    @IsNotEmpty()
    shippingAddress: string;
}