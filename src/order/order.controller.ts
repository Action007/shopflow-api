import {
    Body,
    Controller,
    Get,
    Param,
    Patch,
    Post,
    Query,
    UseGuards,
} from '@nestjs/common';
import { OrderService } from './order.service';
import { PlaceOrderDto } from './dto/place-order.dto';
import { PaginationQueryDto } from 'src/common/dto/pagination-query.dto';
import { Role } from '@prisma/client';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { UpdateOrderStatusDto } from 'src/cart/dto/update-order-status-dto';
import { RolesGuard } from 'src/auth/guards/roles.guard';

@Controller('orders')
export class OrderController {
    constructor(private readonly orderService: OrderService) {}

    @Post()
    async placeOrder(
        @CurrentUser() user: { id: string },
        @Body() dto: PlaceOrderDto,
    ) {
        return this.orderService.placeOrder(user.id, dto);
    }

    @Get()
    async getMyOrders(
        @CurrentUser() user: { id: string },
        @Query() query: PaginationQueryDto,
    ) {
        return this.orderService.getMyOrders(user.id, query);
    }

    @Get(':id')
    async getOrderById(
        @CurrentUser() user: { id: string; role: Role },
        @Param('id') id: string,
    ) {
        return this.orderService.getOrderById(id, user.id, user.role);
    }

    @Post(':id/cancel')
    async cancelOrder(
        @CurrentUser() user: { id: string },
        @Param('id') id: string,
    ) {
        return this.orderService.cancelOrder(id, user.id);
    }

    @Roles(Role.ADMIN)
    @UseGuards(RolesGuard)
    @Patch(':id/status')
    async updateOrderStatus(
        @Param('id') id: string,
        @Body() dto: UpdateOrderStatusDto,
    ) {
        return this.orderService.updateOrderStatus(id, dto.status);
    }
}
