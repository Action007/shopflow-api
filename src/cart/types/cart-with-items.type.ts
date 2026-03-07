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
    items: { include: { product: true } },
} satisfies Prisma.CartInclude;
