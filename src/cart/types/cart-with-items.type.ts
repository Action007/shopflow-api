import { Prisma } from '@prisma/client';

export type CartWithItems = Prisma.CartGetPayload<{
    include: {
        items: {
            include: {
                product: true;
            };
        };
    };
}>;

export const CART_INCLUDE = {
    items: {
        orderBy: { id: 'asc' },
        include: { product: { include: { category: true } } },
    },
} satisfies Prisma.CartInclude;
