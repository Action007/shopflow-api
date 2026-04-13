/**
 * Prisma Mock Factory
 *
 * Creates a fake PrismaService — every DB method is a jest.fn().
 *
 * Spring parallel: Like mocking all your JpaRepositories at once,
 * since Prisma bundles everything into one client.
 *
 * For transactions:
 *   prisma.$transaction.mockImplementation((cb) => cb(prisma));
 *   This makes `tx.product.updateMany` inside your $transaction callback
 *   hit the same mocked functions.
 */
export const createMockPrismaService = () => ({
    user: {
        create: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        deleteMany: jest.fn(),
    },
    product: {
        create: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
        count: jest.fn(),
        delete: jest.fn(),
        deleteMany: jest.fn(),
    },
    category: {
        create: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        deleteMany: jest.fn(),
    },
    cart: {
        create: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        deleteMany: jest.fn(),
    },
    cartItem: {
        create: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        deleteMany: jest.fn(),
    },
    wishlist: {
        create: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        deleteMany: jest.fn(),
    },
    wishlistItem: {
        create: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        delete: jest.fn(),
        deleteMany: jest.fn(),
    },
    order: {
        create: jest.fn(),
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
        delete: jest.fn(),
        deleteMany: jest.fn(),
    },
    orderItem: {
        deleteMany: jest.fn(),
    },
    refreshToken: {
        create: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        deleteMany: jest.fn(),
    },
    upload: {
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
    },
    $transaction: jest.fn(),
    $queryRaw: jest.fn(),
});

export type MockPrismaService = ReturnType<typeof createMockPrismaService>;
