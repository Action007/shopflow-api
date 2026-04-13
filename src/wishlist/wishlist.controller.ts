import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { WishlistService } from './wishlist.service';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import { AddToWishlistDto } from './dto/add-to-wishlist.dto';

@Controller('wishlist')
export class WishlistController {
    constructor(private readonly wishlistService: WishlistService) {}

    @Get()
    async getWishlist(@CurrentUser() user: { id: string }) {
        return this.wishlistService.getWishlist(user.id);
    }

    @Post()
    async addItem(
        @CurrentUser() user: { id: string },
        @Body() dto: AddToWishlistDto,
    ) {
        return this.wishlistService.addItem(user.id, dto);
    }

    @Delete(':productId')
    async removeItem(
        @CurrentUser() user: { id: string },
        @Param('productId', ParseUUIDPipe) productId: string,
    ) {
        return this.wishlistService.removeItem(user.id, productId);
    }
}
