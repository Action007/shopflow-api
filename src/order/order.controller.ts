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
import {
    ApiBearerAuth,
    ApiForbiddenResponse,
    ApiNotFoundResponse,
    ApiOperation,
    ApiParam,
    ApiTags,
} from '@nestjs/swagger';
import { OrderService } from './order.service';
import { PlaceOrderDto } from './dto/place-order.dto';
import { Role } from '@prisma/client';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { UpdateOrderStatusDto } from 'src/order/dto/update-order-status-dto';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { OrderQueryDto } from './dto/order-query.dto';
import {
    ApiEnvelopeResponse,
    ApiErrorResponse,
} from 'src/common/swagger/api-response.decorators';
import {
    ErrorResponseDto,
    OrderDto,
} from 'src/common/swagger/api-response.dto';

@ApiTags('Orders')
@ApiBearerAuth('access-token')
@Controller('orders')
export class OrderController {
    constructor(private readonly orderService: OrderService) {}

    @Post()
    @ApiOperation({ summary: 'Place an order from the current cart' })
    @ApiEnvelopeResponse({
        status: 201,
        description: 'Order placed successfully',
        type: OrderDto,
    })
    @ApiErrorResponse(400, 'Cart is empty or stock is insufficient')
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
    @ApiEnvelopeResponse({
        description: 'Paginated orders list',
        type: OrderDto,
        paginated: true,
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
    @ApiParam({ name: 'id', format: 'uuid' })
    @ApiEnvelopeResponse({
        description: 'Order details',
        type: OrderDto,
    })
    @ApiForbiddenResponse({
        description: 'You cannot access another customer order',
        type: ErrorResponseDto,
    })
    @ApiNotFoundResponse({
        description: 'Order not found',
        type: ErrorResponseDto,
    })
    async getOrderById(
        @CurrentUser() user: { id: string; role: Role },
        @Param('id', ParseUUIDPipe) id: string,
    ) {
        return this.orderService.getOrderById(id, user.id, user.role);
    }

    @Post(':id/cancel')
    @ApiOperation({
        summary: 'Cancel the current user order if it is still cancellable',
    })
    @ApiParam({ name: 'id', format: 'uuid' })
    @ApiEnvelopeResponse({
        status: 201,
        description: 'Order cancelled',
        type: OrderDto,
    })
    @ApiErrorResponse(400, 'Order cannot be cancelled in its current status')
    @ApiForbiddenResponse({
        description: 'You cannot cancel another user order',
        type: ErrorResponseDto,
    })
    @ApiNotFoundResponse({
        description: 'Order not found',
        type: ErrorResponseDto,
    })
    async cancelOrder(
        @CurrentUser() user: { id: string },
        @Param('id', ParseUUIDPipe) id: string,
    ) {
        return this.orderService.cancelOrder(id, user.id);
    }

    @Roles(Role.ADMIN)
    @UseGuards(RolesGuard)
    @Patch(':id/status')
    @ApiOperation({ summary: 'Update order status (admin only)' })
    @ApiParam({ name: 'id', format: 'uuid' })
    @ApiEnvelopeResponse({
        description: 'Updated order status',
        type: OrderDto,
    })
    @ApiErrorResponse(400, 'Invalid status transition')
    @ApiForbiddenResponse({
        description: 'Admin role required',
        type: ErrorResponseDto,
    })
    @ApiNotFoundResponse({
        description: 'Order not found',
        type: ErrorResponseDto,
    })
    async updateOrderStatus(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: UpdateOrderStatusDto,
    ) {
        return this.orderService.updateOrderStatus(id, dto.status);
    }
}
