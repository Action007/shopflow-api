import { Prisma } from "@prisma/client";

export const USER_SELECT = {
    id: true,
    firstName: true,
    lastName: true,
    email: true,
    profileImageUrl: true,
    role: true,
    createdAt: true,
} satisfies Prisma.UserSelect;
