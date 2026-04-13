import { Test, TestingModule } from '@nestjs/testing';
import { WishlistService } from './wishlist.service';
import { PrismaService } from 'src/prisma/prisma.service';
import {
    createMockPrismaService,
    MockPrismaService,
} from 'src/common/test/prisma-mock.factory';
import { NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

describe('WishlistService', () => {
    let service: WishlistService;
    let prisma: MockPrismaService;

    const mockProduct = {
        id: 'prod-1',
        name: 'iPhone 15',
        price: new Prisma.Decimal('999.99'),
        stockQuantity: 50,
        deletedAt: null,
        categoryId: 'cat-1',
    };

    const mockWishlistItem = {
        id: 'wishlist-item-1',
        wishlistId: 'wishlist-1',
        productId: 'prod-1',
        createdAt: new Date(),
        product: mockProduct,
    };

    const mockWishlist = {
        id: 'wishlist-1',
        userId: 'user-1',
        createdAt: new Date(),
        updatedAt: new Date(),
        items: [mockWishlistItem],
    };

    const emptyWishlist = { ...mockWishlist, items: [] };

    beforeEach(async () => {
        prisma = createMockPrismaService();
        prisma.$transaction.mockImplementation(async (callback) => callback(prisma));

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                WishlistService,
                { provide: PrismaService, useValue: prisma },
            ],
        }).compile();

        service = module.get<WishlistService>(WishlistService);
    });

    afterEach(() => jest.clearAllMocks());

    describe('getWishlist', () => {
        it('should return existing wishlist', async () => {
            prisma.wishlist.findFirst.mockResolvedValue(mockWishlist);

            const result = await service.getWishlist('user-1');

            expect(result).toEqual(mockWishlist);
        });

        it('should create wishlist if none exists', async () => {
            prisma.wishlist.findFirst.mockResolvedValue(null);
            prisma.wishlist.create.mockResolvedValue(emptyWishlist);

            const result = await service.getWishlist('user-1');

            expect(prisma.wishlist.create).toHaveBeenCalledWith({
                data: { userId: 'user-1' },
                include: expect.any(Object),
            });
            expect(result).toEqual(emptyWishlist);
        });
    });

    describe('addItem', () => {
        it('should add product when not already in wishlist', async () => {
            prisma.wishlist.findFirst
                .mockResolvedValueOnce(emptyWishlist)
                .mockResolvedValueOnce(mockWishlist);
            prisma.product.findFirst.mockResolvedValue(mockProduct);
            prisma.wishlistItem.create.mockResolvedValue(mockWishlistItem);

            const result = await service.addItem('user-1', {
                productId: 'prod-1',
            });

            expect(prisma.wishlistItem.create).toHaveBeenCalledWith({
                data: {
                    wishlistId: 'wishlist-1',
                    productId: 'prod-1',
                },
            });
            expect(result).toEqual(mockWishlist);
        });

        it('should not duplicate product already in wishlist', async () => {
            prisma.wishlist.findFirst
                .mockResolvedValueOnce(mockWishlist)
                .mockResolvedValueOnce(mockWishlist);
            prisma.product.findFirst.mockResolvedValue(mockProduct);

            await service.addItem('user-1', { productId: 'prod-1' });

            expect(prisma.wishlistItem.create).not.toHaveBeenCalled();
        });

        it('should throw when product not found', async () => {
            prisma.wishlist.findFirst.mockResolvedValue(emptyWishlist);
            prisma.product.findFirst.mockResolvedValue(null);

            await expect(
                service.addItem('user-1', { productId: 'missing' }),
            ).rejects.toThrow(NotFoundException);
        });
    });

    describe('removeItem', () => {
        it('should remove wishlist item', async () => {
            prisma.wishlistItem.findFirst.mockResolvedValue(mockWishlistItem);
            prisma.wishlistItem.delete.mockResolvedValue(mockWishlistItem);
            prisma.wishlist.findFirst.mockResolvedValue(emptyWishlist);

            const result = await service.removeItem('user-1', 'prod-1');

            expect(prisma.wishlistItem.delete).toHaveBeenCalledWith({
                where: { id: 'wishlist-item-1' },
            });
            expect(result).toEqual(emptyWishlist);
        });

        it('should throw when wishlist item not found', async () => {
            prisma.wishlistItem.findFirst.mockResolvedValue(null);

            await expect(
                service.removeItem('user-1', 'missing'),
            ).rejects.toThrow(NotFoundException);
        });
    });
});
