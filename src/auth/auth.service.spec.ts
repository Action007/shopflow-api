import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { UserService } from 'src/user/user.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import {
    createMockPrismaService,
    MockPrismaService,
} from 'src/common/test/prisma-mock.factory';
import { UnauthorizedException } from '@nestjs/common';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt');

describe('AuthService', () => {
    let service: AuthService;
    let prisma: MockPrismaService;
    let userService: {
        findByEmail: jest.Mock;
        findByIdInternal: jest.Mock;
        create: jest.Mock;
    };
    let jwtService: { sign: jest.Mock };
    let configService: { getOrThrow: jest.Mock };

    const mockUser = {
        id: 'user-1',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        password: 'hashed-password',
        profileImageUrl: null,
        role: Role.CUSTOMER,
        deletedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
    };

    beforeEach(async () => {
        prisma = createMockPrismaService();

        userService = {
            findByEmail: jest.fn(),
            findByIdInternal: jest.fn(),
            create: jest.fn(),
        };

        jwtService = {
            sign: jest.fn(),
        };

        configService = {
            getOrThrow: jest.fn().mockReturnValue(604800), // 7 days in seconds
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AuthService,
                { provide: PrismaService, useValue: prisma },
                { provide: UserService, useValue: userService },
                { provide: JwtService, useValue: jwtService },
                { provide: ConfigService, useValue: configService },
            ],
        }).compile();

        service = module.get<AuthService>(AuthService);
    });

    afterEach(() => jest.clearAllMocks());

    // ===== VALIDATE USER =====

    describe('validateUser', () => {
        it('should return user when credentials are valid', async () => {
            userService.findByEmail.mockResolvedValue(mockUser);
            (bcrypt.compare as jest.Mock).mockResolvedValue(true);

            const result = await service.validateUser(
                'john@example.com',
                'password123',
            );

            expect(result).toEqual(mockUser);
            expect(userService.findByEmail).toHaveBeenCalledWith(
                'john@example.com',
            );
            expect(bcrypt.compare).toHaveBeenCalledWith(
                'password123',
                'hashed-password',
            );
        });

        it('should throw UnauthorizedException when user not found', async () => {
            userService.findByEmail.mockResolvedValue(null);

            await expect(
                service.validateUser('nobody@example.com', 'password123'),
            ).rejects.toThrow(UnauthorizedException);

            // bcrypt.compare should NOT have been called — no user to compare against
            expect(bcrypt.compare).not.toHaveBeenCalled();
        });

        it('should throw UnauthorizedException when password is wrong', async () => {
            userService.findByEmail.mockResolvedValue(mockUser);
            (bcrypt.compare as jest.Mock).mockResolvedValue(false);

            await expect(
                service.validateUser('john@example.com', 'wrongpassword'),
            ).rejects.toThrow(UnauthorizedException);
        });
    });

    // ===== REGISTER =====

    describe('register', () => {
        it('should create user and return tokens', async () => {
            userService.create.mockResolvedValue(mockUser);
            jwtService.sign
                .mockReturnValueOnce('access-token') // first call = access token
                .mockReturnValueOnce('refresh-token'); // second call = refresh token
            prisma.refreshToken.create.mockResolvedValue({});

            const result = await service.register(
                {
                    firstName: 'John',
                    lastName: 'Doe',
                    email: 'john@example.com',
                    password: 'password123',
                },
                'Mozilla/5.0',
            );

            expect(result).toEqual({
                accessToken: 'access-token',
                refreshToken: 'refresh-token',
            });
            expect(userService.create).toHaveBeenCalled();
            expect(prisma.refreshToken.create).toHaveBeenCalled();
        });
    });

    // ===== LOGIN =====

    describe('login', () => {
        it('should generate tokens for validated user', async () => {
            jwtService.sign
                .mockReturnValueOnce('access-token')
                .mockReturnValueOnce('refresh-token');
            prisma.refreshToken.create.mockResolvedValue({});

            const result = await service.login(mockUser, 'Mozilla/5.0');

            expect(result).toEqual({
                accessToken: 'access-token',
                refreshToken: 'refresh-token',
            });
            // login doesn't call userService — user already validated by LocalStrategy
            expect(userService.findByEmail).not.toHaveBeenCalled();
        });
    });

    // ===== REFRESH TOKENS =====

    describe('refreshTokens', () => {
        const tokenRecord = {
            id: 'token-1',
            jti: 'some-jti',
            tokenHash: 'some-hash',
            userId: 'user-1',
            expiresAt: new Date(Date.now() + 86400000), // tomorrow
            revokedAt: null,
            userAgent: 'Mozilla/5.0',
            createdAt: new Date(),
        };

        it('should rotate tokens when refresh token is valid', async () => {
            prisma.refreshToken.findFirst.mockResolvedValue(tokenRecord);
            userService.findByIdInternal.mockResolvedValue(mockUser);
            prisma.refreshToken.update.mockResolvedValue({});
            jwtService.sign
                .mockReturnValueOnce('new-access')
                .mockReturnValueOnce('new-refresh');
            prisma.refreshToken.create.mockResolvedValue({});

            const result = await service.refreshTokens(
                'old-refresh-token',
                'Mozilla/5.0',
            );

            expect(result).toEqual({
                accessToken: 'new-access',
                refreshToken: 'new-refresh',
            });
            // Old token should be revoked (revokedAt set)
            expect(prisma.refreshToken.update).toHaveBeenCalledWith({
                where: { id: 'token-1' },
                data: { revokedAt: expect.any(Date) },
            });
            // New token should be created
            expect(prisma.refreshToken.create).toHaveBeenCalled();
        });

        it('should throw UnauthorizedException when token not found in DB', async () => {
            prisma.refreshToken.findFirst.mockResolvedValue(null);

            await expect(
                service.refreshTokens('invalid-token'),
            ).rejects.toThrow(UnauthorizedException);
        });

        it('should throw UnauthorizedException when token is expired', async () => {
            const expiredToken = {
                ...tokenRecord,
                expiresAt: new Date(Date.now() - 86400000), // yesterday
            };
            prisma.refreshToken.findFirst.mockResolvedValue(expiredToken);
            prisma.refreshToken.delete.mockResolvedValue({});

            await expect(
                service.refreshTokens('expired-token'),
            ).rejects.toThrow(UnauthorizedException);

            // Expired token should be deleted
            expect(prisma.refreshToken.delete).toHaveBeenCalledWith({
                where: { id: 'token-1' },
            });
        });

        it('should throw UnauthorizedException when user not found', async () => {
            prisma.refreshToken.findFirst.mockResolvedValue(tokenRecord);
            userService.findByIdInternal.mockResolvedValue(null);

            await expect(
                service.refreshTokens('valid-token'),
            ).rejects.toThrow(UnauthorizedException);
        });
    });

    // ===== LOGOUT =====

    describe('logout', () => {
        it('should delete all refresh tokens for user', async () => {
            prisma.refreshToken.deleteMany.mockResolvedValue({ count: 3 });

            await service.logout('user-1');

            expect(prisma.refreshToken.deleteMany).toHaveBeenCalledWith({
                where: { userId: 'user-1' },
            });
        });
    });
});
