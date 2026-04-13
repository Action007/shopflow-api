import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import {
    WISHLIST_INCLUDE,
    WishlistWithItems,
} from './types/wishlist-with-items.type';
import { AddToWishlistDto } from './dto/add-to-wishlist.dto';
import { ServiceErrorMessage } from 'src/common/constants/service-error-messages';

type PrismaTransactionClient = Prisma.TransactionClient;

@Injectable()
export class WishlistService {
    constructor(private readonly prisma: PrismaService) {}

    async getWishlist(
        userId: string,
        tx: PrismaTransactionClient = this.prisma,
    ): Promise<WishlistWithItems> {
        let wishlist = await tx.wishlist.findFirst({
            where: { userId },
            include: WISHLIST_INCLUDE,
        });

        if (!wishlist) {
            wishlist = await tx.wishlist.create({
                data: { userId },
                include: WISHLIST_INCLUDE,
            });
        }

        return wishlist;
    }

    async addItem(
        userId: string,
        dto: AddToWishlistDto,
    ): Promise<WishlistWithItems> {
        return this.prisma.$transaction(async (tx) => {
            const wishlist = await this.getWishlist(userId, tx);

            const product = await tx.product.findFirst({
                where: { id: dto.productId, deletedAt: null },
            });

            if (!product) {
                throw new NotFoundException(
                    ServiceErrorMessage.PRODUCT_NOT_FOUND,
                );
            }

            const existingItem = wishlist.items.find(
                (item) => item.productId === dto.productId,
            );

            if (!existingItem) {
                await tx.wishlistItem.create({
                    data: {
                        wishlistId: wishlist.id,
                        productId: dto.productId,
                    },
                });
            }

            return this.getWishlist(userId, tx);
        });
    }

    async removeItem(
        userId: string,
        productId: string,
    ): Promise<WishlistWithItems> {
        return this.prisma.$transaction(async (tx) => {
            const wishlistItem = await tx.wishlistItem.findFirst({
                where: { wishlist: { userId }, productId },
            });

            if (!wishlistItem) {
                throw new NotFoundException(
                    ServiceErrorMessage.ITEM_NOT_IN_WISHLIST,
                );
            }

            await tx.wishlistItem.delete({
                where: { id: wishlistItem.id },
            });

            return this.getWishlist(userId, tx);
        });
    }
}
