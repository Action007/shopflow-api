import { IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AddToWishlistDto {
    @ApiProperty({ format: 'uuid' })
    @IsUUID()
    productId: string;
}
