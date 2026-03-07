import {
    BadRequestException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CART_INCLUDE, CartWithItems } from './types/cart-with-items.type';
import { AddToCartDto } from './dto/add-to-cart.dto';
import { ServiceErrorMessage } from 'src/common/constants/service-error-messages';

@Injectable()
export class CartService {
    constructor(
        private readonly prisma: PrismaService,
    ) {}

    async getCart(userId: string): Promise<CartWithItems> {
        let cart = await this.prisma.cart.findFirst({
            where: { userId },
            include: CART_INCLUDE,
        });

        if (!cart) {
            cart = await this.prisma.cart.create({
                data: { userId },
                include: CART_INCLUDE,
            });
        }

        return cart;
    }

    async addItem(userId: string, dto: AddToCartDto): Promise<CartWithItems> {
        const cart = await this.getCart(userId);

        const product = await this.prisma.product.findFirst({
            where: { id: dto.productId, deletedAt: null },
        });
        if (!product) {
            throw new NotFoundException(ServiceErrorMessage.PRODUCT_NOT_FOUND);
        }
        if (product.stockQuantity < dto.quantity) {
            throw new BadRequestException(
                ServiceErrorMessage.INSUFFICIENT_STOCK,
            );
        }

        const existingItem = cart.items.find(
            (item) => item.productId === dto.productId,
        );

        if (existingItem) {
            await this.prisma.cartItem.update({
                where: { id: existingItem.id },
                data: { quantity: existingItem.quantity + dto.quantity },
            });
        } else {
            await this.prisma.cartItem.create({
                data: {
                    cartId: cart.id,
                    productId: dto.productId,
                    quantity: dto.quantity,
                    priceAtAdd: product.price,
                },
            });
        }

        return this.getCart(userId);
    }

    async adjustItemQuantity(
        userId: string,
        productId: string,
        quantity: number,
    ): Promise<CartWithItems> {
        if (quantity < 0) {
            throw new BadRequestException(ServiceErrorMessage.INVALID_QUANTITY);
        }

        const cart = await this.getCart(userId);

        const existingItem = cart.items.find(
            (item) => item.productId === productId,
        );
        if (!existingItem) {
            throw new NotFoundException(ServiceErrorMessage.ITEM_NOT_IN_CART);
        }

        if (quantity === 0) {
            await this.prisma.cartItem.delete({
                where: { id: existingItem.id },
            });
            return this.getCart(userId);
        }

        const product = await this.prisma.product.findFirst({
            where: { id: productId, deletedAt: null },
        });
        if (!product) {
            throw new NotFoundException(ServiceErrorMessage.PRODUCT_NOT_FOUND);
        }

        if (product.stockQuantity < existingItem.quantity + quantity) {
            throw new BadRequestException(
                ServiceErrorMessage.INSUFFICIENT_STOCK,
            );
        }

        await this.prisma.cartItem.update({
            where: { id: existingItem.id },
            data: { quantity: existingItem.quantity + quantity },
        });

        return this.getCart(userId);
    }

    // better way with transactional:
    // async adjustItemQuantity(
    //     userId: string,
    //     productId: string,
    //     quantity: number,
    // ): Promise<CartWithItems> {
    //     if (quantity < 0) {
    //         throw new BadRequestException(ServiceErrorMessage.INVALID_QUANTITY);
    //     }

    //     return this.prisma.$transaction(async (tx) => {
    //         const cartItem = await tx.cartItem.findFirst({
    //             where: {
    //                 cart: { userId },
    //                 productId,
    //             },
    //         });

    //         if (!cartItem) {
    //             throw new NotFoundException(
    //                 ServiceErrorMessage.ITEM_NOT_IN_CART,
    //             );
    //         }

    //         if (quantity === 0) {
    //             await tx.cartItem.delete({ where: { id: cartItem.id } });
    //             return this.getCart(userId);
    //         }

    //         const product = await tx.product.findFirst({
    //             where: { id: productId, deletedAt: null },
    //             select: { stockQuantity: true },
    //         });

    //         if (!product) {
    //             throw new NotFoundException(
    //                 ServiceErrorMessage.PRODUCT_NOT_FOUND,
    //             );
    //         }

    //         const newQuantity = cartItem.quantity + quantity;

    //         if (product.stockQuantity < newQuantity) {
    //             throw new BadRequestException(
    //                 ServiceErrorMessage.INSUFFICIENT_STOCK,
    //             );
    //         }

    //         await tx.cartItem.update({
    //             where: { id: cartItem.id },
    //             data: { quantity: newQuantity },
    //         });

    //         return this.getCart(userId);
    //     });
    // }

    async removeItem(
        userId: string,
        productId: string,
    ): Promise<CartWithItems> {
        const cartItem = await this.prisma.cartItem.findFirst({
            where: {
                cart: { userId },
                productId,
            },
        });

        if (!cartItem) {
            throw new NotFoundException(ServiceErrorMessage.ITEM_NOT_IN_CART);
        }

        await this.prisma.cartItem.delete({
            where: { id: cartItem.id },
        });

        return this.getCart(userId);
    }

    async clearCart(userId: string): Promise<void> {
        await this.prisma.cart.delete({
            where: { userId },
        });
    }
}
