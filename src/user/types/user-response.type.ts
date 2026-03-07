import { Role } from "@prisma/client";

export type UserResponse = {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: Role;
    createdAt: Date;
};