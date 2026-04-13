import { Prisma } from '@prisma/client';

export type WishlistWithItems = Prisma.WishlistGetPayload<{
    include: {
        items: {
            include: {
                product: {
                    include: {
                        category: true;
                    };
                };
            };
        };
    };
}>;

export const WISHLIST_INCLUDE = {
    items: {
        orderBy: { createdAt: 'desc' as const },
        include: { product: { include: { category: true } } },
    },
} satisfies Prisma.WishlistInclude;
