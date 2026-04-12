import {
    BadRequestException,
    ForbiddenException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { Order, OrderStatus, Prisma, Role } from '@prisma/client';
import { PaginationQueryDto } from 'src/common/dto/pagination-query.dto';
import { PaginatedResult } from 'src/common/types/paginated-result.type';
import { PrismaService } from 'src/prisma/prisma.service';
import { PlaceOrderDto } from './dto/place-order.dto';
import {
    CART_INCLUDE,
    ORDER_INCLUDE,
} from 'src/cart/types/cart-with-items.type';
import { ServiceErrorMessage } from 'src/common/constants/service-error-messages';
import { buildPaginationMeta } from 'src/common/utils/paginate';
import { randomUUID } from 'crypto';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class OrderService {
    private static readonly VALID_TRANSITIONS: Record<
        OrderStatus,
        OrderStatus[]
    > = {
        [OrderStatus.PENDING]: [OrderStatus.PROCESSING, OrderStatus.CANCELLED],
        [OrderStatus.PROCESSING]: [
            OrderStatus.SHIPPED,
            OrderStatus.CANCELLED,
        ],
        [OrderStatus.SHIPPED]: [OrderStatus.DELIVERED],
        [OrderStatus.DELIVERED]: [],
        [OrderStatus.CANCELLED]: [],
    };

    constructor(private readonly prisma: PrismaService) {}

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

    async getMyOrders(
        userId: string,
        query: PaginationQueryDto,
    ): Promise<PaginatedResult<Order>> {
        const { page = 1, limit = 10 } = query;

        const where: Prisma.OrderWhereInput = { userId };

        const [items, total] = await Promise.all([
            this.prisma.order.findMany({
                where,
                include: { items: true },
                skip: (page - 1) * limit,
                take: limit,
                orderBy: { createdAt: 'desc' },
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
    ): Promise<Order> {
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

            if (order.status !== OrderStatus.PENDING) {
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

        const allowedStatuses = OrderService.VALID_TRANSITIONS[order.status];
        if (!allowedStatuses.includes(status)) {
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
}
