import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { configureApp } from '../src/create-app';
import * as bcrypt from 'bcrypt';
import { Role, User } from '@prisma/client';
import { AuthService } from '../src/auth/auth.service';

describe('E-Commerce API (e2e)', () => {
    let app: INestApplication;
    let prisma: PrismaService;
    let authService: AuthService;

    let adminToken: string;
    let customerToken: string;
    let customerRefreshToken: string;

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = moduleFixture.createNestApplication();
        await configureApp(app); // Same config as production — no drift
        prisma = app.get(PrismaService);
        authService = app.get(AuthService);
        await app.init();
    });

    beforeEach(async () => {
        await prisma.orderItem.deleteMany();
        await prisma.order.deleteMany();
        await prisma.cartItem.deleteMany();
        await prisma.cart.deleteMany();
        await prisma.refreshToken.deleteMany();
        await prisma.product.deleteMany();
        await prisma.category.deleteMany();
        await prisma.user.deleteMany();

        // Seed test users
        const hashedPassword = await bcrypt.hash('Password123!', 10);

        const adminUser = await prisma.user.create({
            data: {
                firstName: 'Admin',
                lastName: 'User',
                email: 'admin@test.com',
                password: hashedPassword,
                role: Role.ADMIN,
            },
        });

        const customerUser = await prisma.user.create({
            data: {
                firstName: 'Customer',
                lastName: 'User',
                email: 'customer@test.com',
                password: hashedPassword,
                role: Role.CUSTOMER,
            },
        });

        const adminLogin = await authService.login(adminUser as User);
        adminToken = adminLogin.accessToken;

        const customerLogin = await authService.login(customerUser as User);
        customerToken = customerLogin.accessToken;
        customerRefreshToken = customerLogin.refreshToken;
    });

    afterAll(async () => {
        await app.close();
    });

    // ===== AUTH =====

    describe('Auth', () => {
        it('POST /auth/register — should register and return tokens', async () => {
            const res = await request(app.getHttpServer())
                .post('/api/v1/auth/register')
                .send({
                    firstName: 'New',
                    lastName: 'User',
                    email: 'new@test.com',
                    password: 'Password123!',
                })
                .expect(201);

            expect(res.body.success).toBe(true);
            expect(res.body.data.accessToken).toBeDefined();
            expect(res.body.data.refreshToken).toBeDefined();
        });

        it('POST /auth/register — duplicate email returns 409', async () => {
            const res = await request(app.getHttpServer())
                .post('/api/v1/auth/register')
                .send({
                    firstName: 'Dup',
                    lastName: 'User',
                    email: 'customer@test.com', // already exists
                    password: 'Password123!',
                })
                .expect(409);

            expect(res.body.success).toBe(false);
        });

        it('POST /auth/login — valid credentials returns tokens', async () => {
            const res = await request(app.getHttpServer())
                .post('/api/v1/auth/login')
                .send({ email: 'customer@test.com', password: 'Password123!' })
                .expect(201);

            expect(res.body.data.accessToken).toBeDefined();
            expect(res.body.data.refreshToken).toBeDefined();
        });

        it('POST /auth/login — wrong password returns 401', async () => {
            await request(app.getHttpServer())
                .post('/api/v1/auth/login')
                .send({ email: 'customer@test.com', password: 'WrongPassword' })
                .expect(401);
        });

        it('POST /auth/refresh — valid refresh token returns new pair', async () => {
            const res = await request(app.getHttpServer())
                .post('/api/v1/auth/refresh')
                .set('Cookie', `refresh_token=${customerRefreshToken}`)
                .expect(201);

            expect(res.body.data.accessToken).toBeDefined();
            expect(res.body.data.refreshToken).toBeDefined();
            // New tokens should be different from old ones
            expect(res.body.data.refreshToken).not.toBe(customerRefreshToken);
        });

        it('POST /auth/refresh — invalid token returns 401', async () => {
            await request(app.getHttpServer())
                .post('/api/v1/auth/refresh')
                .set('Cookie', 'refresh_token=totally-invalid-token')
                .expect(401);
        });
    });

    // ===== USERS =====

    describe('Users', () => {
        it('GET /users/me — with token returns user data', async () => {
            const res = await request(app.getHttpServer())
                .get('/api/v1/users/me')
                .set('Authorization', `Bearer ${customerToken}`)
                .expect(200);

            expect(res.body.success).toBe(true);
            expect(res.body.data.email).toBe('customer@test.com');
            // Should NOT contain password
            expect(res.body.data.password).toBeUndefined();
        });

        it('GET /users/me — without token returns 401', async () => {
            await request(app.getHttpServer())
                .get('/api/v1/users/me')
                .expect(401);
        });

        it('GET /users — admin can list all users', async () => {
            const res = await request(app.getHttpServer())
                .get('/api/v1/users')
                .set('Authorization', `Bearer ${adminToken}`)
                .expect(200);

            expect(res.body.data.items.length).toBeGreaterThanOrEqual(2);
            expect(res.body.data.meta.total).toBeGreaterThanOrEqual(2);
        });

        it('GET /users — customer gets 403', async () => {
            await request(app.getHttpServer())
                .get('/api/v1/users')
                .set('Authorization', `Bearer ${customerToken}`)
                .expect(403);
        });
    });

    // ===== CATEGORIES =====

    describe('Categories', () => {
        it('GET /categories — public, returns list', async () => {
            // Seed a category first
            await prisma.category.create({ data: { name: 'Electronics' } });

            const res = await request(app.getHttpServer())
                .get('/api/v1/categories')
                .expect(200);

            expect(res.body.success).toBe(true);
            expect(res.body.data.length).toBeGreaterThanOrEqual(1);
        });

        it('POST /categories — admin can create', async () => {
            const res = await request(app.getHttpServer())
                .post('/api/v1/categories')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ name: 'Books', description: 'All kinds of books' })
                .expect(201);

            expect(res.body.data.name).toBe('Books');
        });

        it('POST /categories — customer gets 403', async () => {
            await request(app.getHttpServer())
                .post('/api/v1/categories')
                .set('Authorization', `Bearer ${customerToken}`)
                .send({ name: 'Hacked' })
                .expect(403);
        });
    });

    // ===== PRODUCTS =====

    describe('Products', () => {
        let categoryId: string;

        beforeEach(async () => {
            const cat = await prisma.category.create({
                data: { name: 'Electronics' },
            });
            categoryId = cat.id;
        });

        it('GET /products — public, returns paginated list', async () => {
            await prisma.product.create({
                data: {
                    name: 'Test Product',
                    price: 29.99,
                    stockQuantity: 10,
                    categoryId,
                },
            });

            const res = await request(app.getHttpServer())
                .get('/api/v1/products')
                .expect(200);

            expect(res.body.success).toBe(true);
            expect(res.body.data.items).toBeDefined();
            expect(res.body.data.meta).toBeDefined();
            expect(res.body.data.meta.total).toBe(1);
        });

        it('POST /products — admin can create with 201', async () => {
            const res = await request(app.getHttpServer())
                .post('/api/v1/products')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    name: 'New Product',
                    price: '49.99',
                    stockQuantity: 5,
                    imageUrl: "https://picsum.photos/200/300",
                    categoryId,
                })
                .expect(201);

            expect(res.body.data.name).toBe('New Product');
        });

        it('POST /products — customer gets 403', async () => {
            await request(app.getHttpServer())
                .post('/api/v1/products')
                .set('Authorization', `Bearer ${customerToken}`)
                .send({
                    name: 'Hacked',
                    price: '1.00',
                    stockQuantity: 1,
                    imageUrl: "https://picsum.photos/200/300",
                    categoryId,
                })
                .expect(403);
        });

        it('POST /products — no token returns 401', async () => {
            await request(app.getHttpServer())
                .post('/api/v1/products')
                .send({
                    name: 'NoAuth',
                    price: '1.00',
                    stockQuantity: 1,
                    imageUrl: "https://picsum.photos/200/300",
                    categoryId,
                })
                .expect(401);
        });
    });

    // ===== HEALTH =====

    describe('Health', () => {
        it('GET /health — returns Terminus format without response wrapper', async () => {
            const res = await request(app.getHttpServer())
                .get('/api/v1/health')
                .expect(200);

            // Should be raw Terminus format — NOT wrapped in { success, data }
            expect(res.body.status).toBeDefined();
            expect(res.body.success).toBeUndefined();
        });
    });
});
