import {
    Body,
    Controller,
    Get,
    Param,
    Patch,
    ParseUUIDPipe,
    Post,
    Query,
    UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { OrderService } from './order.service';
import { PlaceOrderDto } from './dto/place-order.dto';
import { Role } from '@prisma/client';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { UpdateOrderStatusDto } from 'src/order/dto/update-order-status-dto';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { OrderQueryDto } from './dto/order-query.dto';

@ApiTags('Orders')
@ApiBearerAuth()
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
    @ApiOperation({
        summary:
            'Get paginated orders. Customers see their own orders; admins can browse all orders.',
    })
    async getOrders(
        @CurrentUser() user: { id: string; role: Role },
        @Query() query: OrderQueryDto,
    ) {
        return this.orderService.getOrders(user.id, user.role, query);
    }

    @Get(':id')
    @ApiOperation({
        summary:
            'Get order details. Customers can access their own orders; admins can access any order.',
    })
    async getOrderById(
        @CurrentUser() user: { id: string; role: Role },
        @Param('id', ParseUUIDPipe) id: string,
    ) {
        return this.orderService.getOrderById(id, user.id, user.role);
    }

    @Post(':id/cancel')
    async cancelOrder(
        @CurrentUser() user: { id: string },
        @Param('id', ParseUUIDPipe) id: string,
    ) {
        return this.orderService.cancelOrder(id, user.id);
    }

    @Roles(Role.ADMIN)
    @UseGuards(RolesGuard)
    @Patch(':id/status')
    async updateOrderStatus(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: UpdateOrderStatusDto,
    ) {
        return this.orderService.updateOrderStatus(id, dto.status);
    }
}
