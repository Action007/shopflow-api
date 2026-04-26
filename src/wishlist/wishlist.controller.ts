import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    ParseUUIDPipe,
    Post,
} from '@nestjs/common';
import {
    ApiBearerAuth,
    ApiNotFoundResponse,
    ApiOperation,
    ApiParam,
    ApiTags,
} from '@nestjs/swagger';
import { WishlistService } from './wishlist.service';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import { AddToWishlistDto } from './dto/add-to-wishlist.dto';
import { ApiEnvelopeResponse } from 'src/common/swagger/api-response.decorators';
import {
    ErrorResponseDto,
    WishlistDto,
} from 'src/common/swagger/api-response.dto';

@ApiTags('Wishlist')
@ApiBearerAuth('access-token')
@Controller('wishlist')
export class WishlistController {
    constructor(private readonly wishlistService: WishlistService) {}

    @Get()
    @ApiOperation({ summary: 'Get the current user wishlist' })
    @ApiEnvelopeResponse({
        description: 'Current wishlist',
        type: WishlistDto,
    })
    async getWishlist(@CurrentUser() user: { id: string }) {
        return this.wishlistService.getWishlist(user.id);
    }

    @Post()
    @ApiOperation({ summary: 'Add a product to the current user wishlist' })
    @ApiEnvelopeResponse({
        status: 201,
        description: 'Updated wishlist after adding an item',
        type: WishlistDto,
    })
    @ApiNotFoundResponse({
        description: 'Product not found',
        type: ErrorResponseDto,
    })
    async addItem(
        @CurrentUser() user: { id: string },
        @Body() dto: AddToWishlistDto,
    ) {
        return this.wishlistService.addItem(user.id, dto);
    }

    @Delete(':productId')
    @ApiOperation({
        summary: 'Remove a product from the current user wishlist',
    })
    @ApiParam({ name: 'productId', format: 'uuid' })
    @ApiEnvelopeResponse({
        description: 'Updated wishlist after removing an item',
        type: WishlistDto,
    })
    @ApiNotFoundResponse({
        description: 'Wishlist item not found',
        type: ErrorResponseDto,
    })
    async removeItem(
        @CurrentUser() user: { id: string },
        @Param('productId', ParseUUIDPipe) productId: string,
    ) {
        return this.wishlistService.removeItem(user.id, productId);
    }
}
