import { Test, TestingModule } from '@nestjs/testing';
import { OrderService } from './order.service';
import { PrismaService } from 'src/prisma/prisma.service';
import {
    createMockPrismaService,
    MockPrismaService,
} from 'src/common/test/prisma-mock.factory';
import {
    BadRequestException,
    ForbiddenException,
    NotFoundException,
} from '@nestjs/common';
import { OrderStatus, Prisma, Role } from '@prisma/client';

describe('OrderService', () => {
    let service: OrderService;
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
        items: [mockCartItem],
    };

    const mockOrder = {
        id: 'order-1',
        orderNumber: 'ORD-123',
        userId: 'user-1',
        status: OrderStatus.PENDING,
        totalAmount: new Prisma.Decimal('1999.98'),
        shippingAddress: '123 Main St',
        paidAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        items: [
            {
                id: 'oi-1',
                orderId: 'order-1',
                productId: 'prod-1',
                quantity: 2,
                priceAtPurchase: new Prisma.Decimal('999.99'),
                productNameAtPurchase: 'iPhone 15',
            },
        ],
    };

    beforeEach(async () => {
        prisma = createMockPrismaService();
        // KEY: Make $transaction execute the callback with the same mock object.
        // This way tx.cart.findFirst, tx.product.updateMany, etc. all hit
        // the same jest.fn() mocks we set up in each test.
        prisma.$transaction.mockImplementation((cb) => cb(prisma));

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                OrderService,
                { provide: PrismaService, useValue: prisma },
            ],
        }).compile();

        service = module.get<OrderService>(OrderService);
    });

    afterEach(() => jest.clearAllMocks());

    // ===== PLACE ORDER =====

    describe('placeOrder', () => {
        it('should create order, decrement stock, and clear cart', async () => {
            prisma.cart.findFirst.mockResolvedValue(mockCart);
            prisma.product.updateMany.mockResolvedValue({ count: 1 }); // stock available
            prisma.order.create.mockResolvedValue(mockOrder);
            prisma.cart.delete.mockResolvedValue(mockCart);

            const result = await service.placeOrder('user-1', {
                shippingAddress: '123 Main St',
            });

            expect(result).toEqual(mockOrder);

            // Verify stock was decremented atomically
            expect(prisma.product.updateMany).toHaveBeenCalledWith({
                where: {
                    id: 'prod-1',
                    stockQuantity: { gte: 2 },
                    deletedAt: null,
                },
                data: { stockQuantity: { decrement: 2 } },
            });

            // Verify cart was cleared
            expect(prisma.cart.delete).toHaveBeenCalledWith({
                where: { id: 'cart-1' },
            });

            // Verify order was created with item snapshot
            expect(prisma.order.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({
                        userId: 'user-1',
                        shippingAddress: '123 Main St',
                        items: expect.objectContaining({
                            create: expect.arrayContaining([
                                expect.objectContaining({
                                    productId: 'prod-1',
                                    quantity: 2,
                                    productNameAtPurchase: 'iPhone 15',
                                }),
                            ]),
                        }),
                    }),
                }),
            );
        });

        it('should throw BadRequestException when cart is empty', async () => {
            prisma.cart.findFirst.mockResolvedValue({ ...mockCart, items: [] });

            await expect(
                service.placeOrder('user-1', {
                    shippingAddress: '123 Main St',
                }),
            ).rejects.toThrow(BadRequestException);
        });

        it('should throw BadRequestException when cart is null', async () => {
            prisma.cart.findFirst.mockResolvedValue(null);

            await expect(
                service.placeOrder('user-1', {
                    shippingAddress: '123 Main St',
                }),
            ).rejects.toThrow(BadRequestException);
        });

        it('should throw BadRequestException when insufficient stock', async () => {
            prisma.cart.findFirst.mockResolvedValue(mockCart);
            prisma.product.updateMany.mockResolvedValue({ count: 0 }); // stock depleted

            await expect(
                service.placeOrder('user-1', {
                    shippingAddress: '123 Main St',
                }),
            ).rejects.toThrow(BadRequestException);

            // Order should NOT have been created
            expect(prisma.order.create).not.toHaveBeenCalled();
        });
    });

    // ===== GET MY ORDERS =====

    describe('getMyOrders', () => {
        it('should return paginated orders', async () => {
            prisma.order.findMany.mockResolvedValue([mockOrder]);
            prisma.order.count.mockResolvedValue(1);

            const result = await service.getMyOrders('user-1', {
                page: 1,
                limit: 10,
            });

            expect(result.items).toEqual([mockOrder]);
            expect(result.meta.total).toBe(1);
            expect(prisma.order.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: { userId: 'user-1' },
                    skip: 0,
                    take: 10,
                }),
            );
        });
    });

    // ===== GET ORDER BY ID =====

    describe('getOrderById', () => {
        it('should return order when user is owner', async () => {
            prisma.order.findUnique.mockResolvedValue(mockOrder);

            const result = await service.getOrderById(
                'order-1',
                'user-1',
                Role.CUSTOMER,
            );

            expect(result).toEqual(mockOrder);
        });

        it('should return order when user is admin', async () => {
            prisma.order.findUnique.mockResolvedValue(mockOrder);

            const result = await service.getOrderById(
                'order-1',
                'other-user',
                Role.ADMIN,
            );

            expect(result).toEqual(mockOrder);
        });

        it('should throw ForbiddenException when non-owner non-admin', async () => {
            prisma.order.findUnique.mockResolvedValue(mockOrder);

            await expect(
                service.getOrderById('order-1', 'other-user', Role.CUSTOMER),
            ).rejects.toThrow(ForbiddenException);
        });

        it('should throw NotFoundException when order not found', async () => {
            prisma.order.findUnique.mockResolvedValue(null);

            await expect(
                service.getOrderById('nonexistent', 'user-1', Role.CUSTOMER),
            ).rejects.toThrow(NotFoundException);
        });
    });

    // ===== CANCEL ORDER =====

    describe('cancelOrder', () => {
        it('should cancel pending order and restore stock', async () => {
            prisma.order.findUnique.mockResolvedValue(mockOrder);
            prisma.product.update.mockResolvedValue(mockProduct);
            prisma.order.update.mockResolvedValue({
                ...mockOrder,
                status: OrderStatus.CANCELLED,
            });

            const result = await service.cancelOrder('order-1', 'user-1');

            expect(result.status).toBe(OrderStatus.CANCELLED);

            // Stock should be restored
            expect(prisma.product.update).toHaveBeenCalledWith({
                where: { id: 'prod-1' },
                data: { stockQuantity: { increment: 2 } },
            });
        });

        it('should throw ForbiddenException when not owner', async () => {
            prisma.order.findUnique.mockResolvedValue(mockOrder);

            await expect(
                service.cancelOrder('order-1', 'other-user'),
            ).rejects.toThrow(ForbiddenException);
        });

        it('should throw BadRequestException when order not PENDING', async () => {
            prisma.order.findUnique.mockResolvedValue({
                ...mockOrder,
                status: OrderStatus.SHIPPED,
            });

            await expect(
                service.cancelOrder('order-1', 'user-1'),
            ).rejects.toThrow(BadRequestException);
        });

        it('should throw NotFoundException when order not found', async () => {
            prisma.order.findUnique.mockResolvedValue(null);

            await expect(
                service.cancelOrder('nonexistent', 'user-1'),
            ).rejects.toThrow(NotFoundException);
        });
    });

    // ===== UPDATE ORDER STATUS =====

    describe('updateOrderStatus', () => {
        it('should update status when order exists', async () => {
            prisma.order.findUnique.mockResolvedValue(mockOrder);
            prisma.order.update.mockResolvedValue({
                ...mockOrder,
                status: OrderStatus.PROCESSING,
            });

            const result = await service.updateOrderStatus(
                'order-1',
                OrderStatus.PROCESSING,
            );

            expect(result.status).toBe(OrderStatus.PROCESSING);
        });

        it('should throw NotFoundException when order not found', async () => {
            prisma.order.findUnique.mockResolvedValue(null);

            await expect(
                service.updateOrderStatus('nonexistent', OrderStatus.PROCESSING),
            ).rejects.toThrow(NotFoundException);
        });
    });
});
