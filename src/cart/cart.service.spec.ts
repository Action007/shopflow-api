import { Test, TestingModule } from '@nestjs/testing';
import { CartService } from './cart.service';
import { PrismaService } from 'src/prisma/prisma.service';
import {
    createMockPrismaService,
    MockPrismaService,
} from 'src/common/test/prisma-mock.factory';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

describe('CartService', () => {
    let service: CartService;
    let prisma: MockPrismaService;

    const mockProduct = {
        id: 'prod-1',
        name: 'iPhone 15',
        price: new Prisma.Decimal('999.99'),
        stockQuantity: 50,
        deletedAt: null,
    };

    const mockCartItem = {
        id: 'item-1',
        cartId: 'cart-1',
        productId: 'prod-1',
        quantity: 2,
        priceAtAdd: new Prisma.Decimal('999.99'),
        product: mockProduct,
    };

    const mockCart = {
        id: 'cart-1',
        userId: 'user-1',
        createdAt: new Date(),
        updatedAt: new Date(),
        items: [mockCartItem],
    };

    const emptyCart = { ...mockCart, items: [] };

    beforeEach(async () => {
        prisma = createMockPrismaService();
        prisma.$transaction.mockImplementation(async (callback) => callback(prisma));

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                CartService,
                { provide: PrismaService, useValue: prisma },
            ],
        }).compile();

        service = module.get<CartService>(CartService);
    });

    afterEach(() => jest.clearAllMocks());

    // ===== GET CART =====

    describe('getCart', () => {
        it('should return existing cart', async () => {
            prisma.cart.findFirst.mockResolvedValue(mockCart);

            const result = await service.getCart('user-1');

            expect(result).toEqual(mockCart);
        });

        it('should create cart if none exists', async () => {
            prisma.cart.findFirst.mockResolvedValue(null);
            prisma.cart.create.mockResolvedValue(emptyCart);

            const result = await service.getCart('user-1');

            expect(prisma.cart.create).toHaveBeenCalledWith({
                data: { userId: 'user-1' },
                include: expect.any(Object),
            });
            expect(result).toEqual(emptyCart);
        });
    });

    // ===== ADD ITEM =====

    describe('addItem', () => {
        it('should add new item to cart', async () => {
            // First getCart call returns empty cart, second returns cart with new item
            prisma.cart.findFirst
                .mockResolvedValueOnce(emptyCart) // getCart inside addItem
                .mockResolvedValueOnce(mockCart); // getCart at end to return updated
            prisma.product.findFirst.mockResolvedValue(mockProduct);
            prisma.cartItem.create.mockResolvedValue(mockCartItem);

            const result = await service.addItem('user-1', {
                productId: 'prod-1',
                quantity: 2,
            });

            expect(prisma.cartItem.create).toHaveBeenCalled();
        });

        it('should update quantity when item already in cart', async () => {
            prisma.cart.findFirst
                .mockResolvedValueOnce(mockCart) // cart already has prod-1
                .mockResolvedValueOnce(mockCart);
            prisma.product.findFirst.mockResolvedValue(mockProduct);
            prisma.cartItem.update.mockResolvedValue(mockCartItem);

            await service.addItem('user-1', {
                productId: 'prod-1',
                quantity: 1,
            });

            expect(prisma.cartItem.update).toHaveBeenCalledWith({
                where: { id: 'item-1' },
                data: { quantity: 3 }, // existing 2 + new 1
            });
        });

        it('should throw NotFoundException when product not found', async () => {
            prisma.cart.findFirst.mockResolvedValue(emptyCart);
            prisma.product.findFirst.mockResolvedValue(null);

            await expect(
                service.addItem('user-1', {
                    productId: 'nonexistent',
                    quantity: 1,
                }),
            ).rejects.toThrow(NotFoundException);
        });

        it('should throw BadRequestException when insufficient stock', async () => {
            prisma.cart.findFirst.mockResolvedValue(emptyCart);
            prisma.product.findFirst.mockResolvedValue({
                ...mockProduct,
                stockQuantity: 0,
            });

            await expect(
                service.addItem('user-1', { productId: 'prod-1', quantity: 5 }),
            ).rejects.toThrow(BadRequestException);
        });
    });

    // ===== REMOVE ITEM =====

    describe('removeItem', () => {
        it('should remove item from cart', async () => {
            prisma.cartItem.findFirst.mockResolvedValue(mockCartItem);
            prisma.cartItem.delete.mockResolvedValue(mockCartItem);
            prisma.cart.findFirst.mockResolvedValue(emptyCart); // returned after removal

            const result = await service.removeItem('user-1', 'prod-1');

            expect(prisma.cartItem.delete).toHaveBeenCalledWith({
                where: { id: 'item-1' },
            });
        });

        it('should throw NotFoundException when item not in cart', async () => {
            prisma.cartItem.findFirst.mockResolvedValue(null);

            await expect(
                service.removeItem('user-1', 'nonexistent'),
            ).rejects.toThrow(NotFoundException);
        });
    });

    // ===== CLEAR CART =====

    describe('clearCart', () => {
        it('should clear the cart idempotently', async () => {
            prisma.cart.deleteMany.mockResolvedValue({ count: 1 });

            await service.clearCart('user-1');

            expect(prisma.cart.deleteMany).toHaveBeenCalledWith({
                where: { userId: 'user-1' },
            });
        });
    });
});
