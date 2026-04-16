import { Prisma } from '@prisma/client';

export const ORDER_USER_SELECT = {
    id: true,
    firstName: true,
    lastName: true,
    email: true,
} satisfies Prisma.UserSelect;

export const ORDER_INCLUDE = {
    items: { include: { product: true } },
    user: { select: ORDER_USER_SELECT },
} satisfies Prisma.OrderInclude;

export type OrderResponse = Prisma.OrderGetPayload<{
    include: typeof ORDER_INCLUDE;
}>;
