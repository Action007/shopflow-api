import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { OrderStatus } from '@prisma/client';

export class UpdateOrderStatusDto {
    @ApiProperty({ enum: OrderStatus, example: OrderStatus.PROCESSING })
    @IsEnum(OrderStatus)
    status: OrderStatus;
}
