import {
    BadRequestException,
    ForbiddenException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { Order, OrderStatus, Prisma, Role } from '@prisma/client';
import { PaginatedResult } from 'src/common/types/paginated-result.type';
import { PrismaService } from 'src/prisma/prisma.service';
import { PlaceOrderDto } from './dto/place-order.dto';
import { CART_INCLUDE } from 'src/cart/types/cart-with-items.type';
import { ServiceErrorMessage } from 'src/common/constants/service-error-messages';
import { buildPaginationMeta } from 'src/common/utils/paginate';
import { randomUUID } from 'crypto';
import { Decimal } from '@prisma/client/runtime/library';
import { OrderQueryDto } from './dto/order-query.dto';
import { ORDER_INCLUDE, OrderResponse } from './types/order-response.type';

@Injectable()
export class OrderService {
    private static readonly VALID_TRANSITIONS: Record<
        OrderStatus,
        OrderStatus[]
    > = {
        [OrderStatus.PENDING]: [OrderStatus.PROCESSING, OrderStatus.CANCELLED],
        [OrderStatus.PROCESSING]: [OrderStatus.SHIPPED, OrderStatus.CANCELLED],
        [OrderStatus.SHIPPED]: [OrderStatus.DELIVERED],
        [OrderStatus.DELIVERED]: [],
        [OrderStatus.CANCELLED]: [],
    };

    constructor(private readonly prisma: PrismaService) {}

    private isTransitionAllowed(
        currentStatus: OrderStatus,
        nextStatus: OrderStatus,
    ): boolean {
        return OrderService.VALID_TRANSITIONS[currentStatus].includes(
            nextStatus,
        );
    }

    async placeOrder(userId: string, dto: PlaceOrderDto): Promise<Order> {
        return this.prisma.$transaction(async (tx) => {
            const cart = await tx.cart.findFirst({
                where: { userId },
                include: CART_INCLUDE,
            });

            if (!cart || !cart.items.length) {
                throw new BadRequestException(
                    ServiceErrorMessage.CART_IS_EMPTY,
                );
            }

            for (const item of cart.items) {
                const updated = await tx.product.updateMany({
                    where: {
                        id: item.productId,
                        stockQuantity: { gte: item.quantity },
                        deletedAt: null,
                    },
                    data: { stockQuantity: { decrement: item.quantity } },
                });

                if (updated.count === 0) {
                    throw new BadRequestException(
                        ServiceErrorMessage.INSUFFICIENT_STOCK(
                            item.product.name,
                        ),
                    );
                }
            }

            const totalAmount = cart.items.reduce(
                (sum, item) =>
                    sum.add(new Decimal(item.quantity).mul(item.product.price)),
                new Decimal(0),
            );
            const orderNumber = `ORD-${randomUUID().split('-')[0].toUpperCase()}-${Date.now()}`;

            const order = await tx.order.create({
                data: {
                    userId,
                    orderNumber,
                    totalAmount,
                    shippingAddress: dto.shippingAddress,
                    items: {
                        create: cart.items.map((item) => ({
                            productId: item.productId,
                            quantity: item.quantity,
                            priceAtPurchase: item.product.price,
                            productNameAtPurchase: item.product.name,
                        })),
                    },
                },
                include: { items: true },
            });

            await tx.cart.delete({ where: { id: cart.id } });

            return order;
        });
    }

    async getOrders(
        userId: string,
        userRole: Role,
        query: OrderQueryDto,
    ): Promise<PaginatedResult<OrderResponse>> {
        const {
            page = 1,
            limit = 10,
            sortBy = 'createdAt',
            sortOrder = 'desc',
        } = query;
        const where = this.buildOrderWhereInput(userId, userRole, query);

        const [items, total] = await Promise.all([
            this.prisma.order.findMany({
                where,
                include: ORDER_INCLUDE,
                skip: (page - 1) * limit,
                take: limit,
                orderBy: [{ [sortBy]: sortOrder }, { id: sortOrder }],
            }),
            this.prisma.order.count({ where }),
        ]);

        return {
            items,
            meta: buildPaginationMeta(total, page, limit),
        };
    }

    async getOrderById(
        orderId: string,
        userId: string,
        userRole: Role,
    ): Promise<OrderResponse> {
        const order = await this.prisma.order.findUnique({
            where: { id: orderId },
            include: ORDER_INCLUDE,
        });

        if (!order) {
            throw new NotFoundException(ServiceErrorMessage.ORDER_NOT_FOUND);
        }

        if (userRole !== Role.ADMIN && order.userId !== userId) {
            throw new ForbiddenException();
        }

        return order;
    }

    async cancelOrder(orderId: string, userId: string): Promise<Order> {
        return this.prisma.$transaction(async (tx) => {
            const order = await tx.order.findUnique({
                where: { id: orderId },
                include: { items: true },
            });

            if (!order) {
                throw new NotFoundException(
                    ServiceErrorMessage.ORDER_NOT_FOUND,
                );
            }

            if (order.userId !== userId) {
                throw new ForbiddenException();
            }

            if (
                !this.isTransitionAllowed(order.status, OrderStatus.CANCELLED)
            ) {
                throw new BadRequestException(
                    ServiceErrorMessage.ORDER_NOT_CANCELLABLE,
                );
            }

            await Promise.all(
                order.items.map((item) => {
                    return tx.product.update({
                        where: { id: item.productId },
                        data: { stockQuantity: { increment: item.quantity } },
                    });
                }),
            );

            return tx.order.update({
                where: { id: orderId },
                data: { status: OrderStatus.CANCELLED },
                include: { items: true },
            });
        });
    }

    async updateOrderStatus(
        orderId: string,
        status: OrderStatus,
    ): Promise<Order> {
        const order = await this.prisma.order.findUnique({
            where: { id: orderId },
        });

        if (!order) {
            throw new NotFoundException(ServiceErrorMessage.ORDER_NOT_FOUND);
        }

        if (!this.isTransitionAllowed(order.status, status)) {
            throw new BadRequestException(
                `Cannot transition from ${order.status} to ${status}`,
            );
        }

        return this.prisma.order.update({
            where: { id: orderId },
            data: { status },
            include: { items: true },
        });
    }

    private buildOrderWhereInput(
        userId: string,
        userRole: Role,
        query: OrderQueryDto,
    ): Prisma.OrderWhereInput {
        const where: Prisma.OrderWhereInput = {};

        if (userRole !== Role.ADMIN) {
            where.userId = userId;
        } else if (query.userId) {
            where.userId = query.userId;
        }

        if (query.status) {
            where.status = query.status;
        }

        if (query.search) {
            const searchTerms = query.search.split(/\s+/).filter(Boolean);
            where.OR = [
                {
                    orderNumber: {
                        contains: query.search,
                        mode: 'insensitive',
                    },
                },
                {
                    user: {
                        firstName: {
                            contains: query.search,
                            mode: 'insensitive',
                        },
                    },
                },
                {
                    user: {
                        lastName: {
                            contains: query.search,
                            mode: 'insensitive',
                        },
                    },
                },
                {
                    user: {
                        email: {
                            contains: query.search,
                            mode: 'insensitive',
                        },
                    },
                },
            ];

            if (searchTerms.length >= 2) {
                where.OR.push({
                    user: {
                        AND: [
                            {
                                firstName: {
                                    contains: searchTerms[0],
                                    mode: 'insensitive',
                                },
                            },
                            {
                                lastName: {
                                    contains: searchTerms.slice(1).join(' '),
                                    mode: 'insensitive',
                                },
                            },
                        ],
                    },
                });
            }
        }

        if (query.dateFrom || query.dateTo) {
            where.createdAt = {};

            if (query.dateFrom) {
                where.createdAt.gte = new Date(query.dateFrom);
            }

            if (query.dateTo) {
                where.createdAt.lte = this.normalizeDateToEndOfDay(
                    query.dateTo,
                );
            }
        }

        return where;
    }

    private normalizeDateToEndOfDay(value: string): Date {
        const hasExplicitTime = value.includes('T');
        if (hasExplicitTime) {
            return new Date(value);
        }

        return new Date(`${value}T23:59:59.999Z`);
    }
}
