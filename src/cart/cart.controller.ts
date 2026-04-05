import {
    Body,
    Controller,
    Delete,
    Get,
    HttpCode,
    HttpStatus,
    Param,
    Patch,
    Post,
} from '@nestjs/common';
import { CartService } from './cart.service';
import { AddToCartDto } from './dto/add-to-cart.dto';
import { CartWithItems } from './types/cart-with-items.type';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import { AdjustCartItemDto } from './dto/adjust-cart-item.dto';

@Controller('cart')
export class CartController {
    constructor(private readonly cartService: CartService) {}

    @Get()
    async getCart(@CurrentUser() user: { id: string }): Promise<CartWithItems> {
        return this.cartService.getCart(user.id);
    }

    @Post()
    async addItem(
        @CurrentUser() user: { id: string },
        @Body() dto: AddToCartDto,
    ): Promise<CartWithItems> {
        return this.cartService.addItem(user.id, dto);
    }

    @Patch(':productId')
    async adjustItemQuantity(
        @CurrentUser() user: { id: string },
        @Param('productId') productId: string,
        @Body() dto: AdjustCartItemDto,
    ): Promise<CartWithItems> {
        return this.cartService.adjustItemQuantity(
            user.id,
            productId,
            dto.quantity,
        );
    }

    @Delete(':productId')
    async removeItem(
        @CurrentUser() user: { id: string },
        @Param('productId') productId: string,
    ): Promise<CartWithItems> {
        return this.cartService.removeItem(user.id, productId);
    }

    @Delete()
    async clearCart(@CurrentUser() user: { id: string }): Promise<void> {
        return this.cartService.clearCart(user.id);
    }
}
