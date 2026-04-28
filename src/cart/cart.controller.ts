import {
    Body,
    Controller,
    Delete,
    Get,
    HttpCode,
    HttpStatus,
    Param,
    Patch,
    ParseUUIDPipe,
    Post,
} from '@nestjs/common';
import {
    ApiBearerAuth,
    ApiNotFoundResponse,
    ApiOperation,
    ApiParam,
    ApiTags,
    ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CartService } from './cart.service';
import { AddToCartDto } from './dto/add-to-cart.dto';
import { CartWithItems } from './types/cart-with-items.type';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import { AdjustCartItemDto } from './dto/adjust-cart-item.dto';
import {
    ApiEnvelopeResponse,
    ApiErrorResponse,
} from 'src/common/swagger/api-response.decorators';
import { CartDto, ErrorResponseDto } from 'src/common/swagger/api-response.dto';

@ApiTags('Cart')
@ApiBearerAuth('access-token')
@Controller('cart')
export class CartController {
    constructor(private readonly cartService: CartService) {}

    @Get()
    @ApiOperation({ summary: 'Get the current user cart' })
    @ApiEnvelopeResponse({
        description: 'Current cart',
        type: CartDto,
    })
    @ApiUnauthorizedResponse({
        description: 'Missing or invalid access token',
        type: ErrorResponseDto,
    })
    async getCart(@CurrentUser() user: { id: string }): Promise<CartWithItems> {
        return this.cartService.getCart(user.id);
    }

    @Post()
    @ApiOperation({ summary: 'Add a product to the current user cart' })
    @ApiEnvelopeResponse({
        status: 201,
        description: 'Updated cart after adding an item',
        type: CartDto,
    })
    @ApiErrorResponse(400, 'Invalid payload or insufficient stock')
    @ApiUnauthorizedResponse({
        description: 'Missing or invalid access token',
        type: ErrorResponseDto,
    })
    @ApiNotFoundResponse({
        description: 'Product not found',
        type: ErrorResponseDto,
    })
    async addItem(
        @CurrentUser() user: { id: string },
        @Body() dto: AddToCartDto,
    ): Promise<CartWithItems> {
        return this.cartService.addItem(user.id, dto);
    }

    @Patch(':productId')
    @ApiOperation({
        summary: 'Set the quantity of an item in the current user cart',
    })
    @ApiParam({ name: 'productId', format: 'uuid' })
    @ApiEnvelopeResponse({
        description: 'Updated cart after changing item quantity',
        type: CartDto,
    })
    @ApiErrorResponse(400, 'Invalid payload or insufficient stock')
    @ApiUnauthorizedResponse({
        description: 'Missing or invalid access token',
        type: ErrorResponseDto,
    })
    @ApiNotFoundResponse({
        description: 'Cart item or product not found',
        type: ErrorResponseDto,
    })
    async adjustItemQuantity(
        @CurrentUser() user: { id: string },
        @Param('productId', ParseUUIDPipe) productId: string,
        @Body() dto: AdjustCartItemDto,
    ): Promise<CartWithItems> {
        return this.cartService.adjustItemQuantity(
            user.id,
            productId,
            dto.quantity,
        );
    }

    @Delete(':productId')
    @ApiOperation({ summary: 'Remove an item from the current user cart' })
    @ApiParam({ name: 'productId', format: 'uuid' })
    @ApiEnvelopeResponse({
        description: 'Updated cart after removing an item',
        type: CartDto,
    })
    @ApiUnauthorizedResponse({
        description: 'Missing or invalid access token',
        type: ErrorResponseDto,
    })
    @ApiNotFoundResponse({
        description: 'Cart item not found',
        type: ErrorResponseDto,
    })
    async removeItem(
        @CurrentUser() user: { id: string },
        @Param('productId', ParseUUIDPipe) productId: string,
    ): Promise<CartWithItems> {
        return this.cartService.removeItem(user.id, productId);
    }

    @Delete()
    @ApiOperation({ summary: 'Clear the current user cart' })
    @ApiEnvelopeResponse({
        description: 'Cart cleared',
    })
    @ApiUnauthorizedResponse({
        description: 'Missing or invalid access token',
        type: ErrorResponseDto,
    })
    async clearCart(@CurrentUser() user: { id: string }): Promise<void> {
        return this.cartService.clearCart(user.id);
    }
}
