import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { configureApp } from '../src/create-app';
import * as bcrypt from 'bcrypt';
import { Role, UploadStatus, User } from '@prisma/client';
import { AuthService } from '../src/auth/auth.service';
import { promises as fs } from 'fs';
import { join } from 'path';

describe('E-Commerce API (e2e)', () => {
    let app: INestApplication;
    let prisma: PrismaService;
    let authService: AuthService;

    let adminToken: string;
    let customerToken: string;
    let customerRefreshToken: string;
    let customerUserId: string;

    const uploadsDir = join(process.cwd(), 'uploads');
    const pngFixture = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9sWvyaAAAAAASUVORK5CYII=',
        'base64',
    );

    function uploadTestImage(token: string, filename = 'test.png') {
        return request(app.getHttpServer())
            .post('/api/v1/uploads/images')
            .set('Authorization', `Bearer ${token}`)
            .attach('file', pngFixture, {
                filename,
                contentType: 'image/png',
            });
    }

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
        await fs.rm(uploadsDir, { recursive: true, force: true });
        await fs.mkdir(uploadsDir, { recursive: true });

        await prisma.orderItem.deleteMany();
        await prisma.order.deleteMany();
        await prisma.cartItem.deleteMany();
        await prisma.cart.deleteMany();
        await prisma.wishlistItem.deleteMany();
        await prisma.wishlist.deleteMany();
        await prisma.refreshToken.deleteMany();
        await prisma.upload.deleteMany();
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
        customerUserId = customerUser.id;
    });

    afterAll(async () => {
        await fs.rm(uploadsDir, { recursive: true, force: true });
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
            const uploadRes = await uploadTestImage(
                adminToken,
                'product.png',
            ).expect(201);

            const res = await request(app.getHttpServer())
                .post('/api/v1/products')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    name: 'New Product',
                    price: '49.99',
                    stockQuantity: 5,
                    imageUploadId: uploadRes.body.data.id,
                    categoryId,
                })
                .expect(201);

            expect(res.body.data.name).toBe('New Product');
            expect(res.body.data.imageUrl).toContain('/uploads/');
        });

        it('POST /products — customer gets 403', async () => {
            await request(app.getHttpServer())
                .post('/api/v1/products')
                .set('Authorization', `Bearer ${customerToken}`)
                .send({
                    name: 'Hacked',
                    price: '1.00',
                    stockQuantity: 1,
                    imageUploadId: '11111111-1111-1111-1111-111111111111',
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
                    imageUploadId: '11111111-1111-1111-1111-111111111111',
                    categoryId,
                })
                .expect(401);
        });
    });

    // ===== UPLOADS =====

    describe('Uploads', () => {
        it('POST /uploads/images — stores a pending image upload', async () => {
            const res = await uploadTestImage(
                customerToken,
                'avatar.png',
            ).expect(201);

            expect(res.body.success).toBe(true);
            expect(res.body.data.originalName).toBe('avatar.png');
            expect(res.body.data.mimeType).toBe('image/png');
            expect(res.body.data.status).toBe(UploadStatus.PENDING);
            expect(res.body.data.url).toContain('/uploads/');

            const storedUpload = await prisma.upload.findUnique({
                where: { id: res.body.data.id },
            });
            expect(storedUpload).not.toBeNull();
        });

        it('DELETE /uploads/:id — removes a pending upload owned by the user', async () => {
            const uploadRes = await uploadTestImage(
                customerToken,
                'remove-me.png',
            ).expect(201);

            await request(app.getHttpServer())
                .delete(`/api/v1/uploads/${uploadRes.body.data.id}`)
                .set('Authorization', `Bearer ${customerToken}`)
                .expect(204);

            const storedUpload = await prisma.upload.findUnique({
                where: { id: uploadRes.body.data.id },
            });
            expect(storedUpload).toBeNull();
        });

        it('POST /products — consumes an upload and stores its public URL', async () => {
            const category = await prisma.category.create({
                data: { name: 'Accessories' },
            });
            const uploadRes = await uploadTestImage(
                adminToken,
                'catalog.png',
            ).expect(201);

            const res = await request(app.getHttpServer())
                .post('/api/v1/products')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    name: 'Uploaded Product',
                    price: '19.99',
                    stockQuantity: 7,
                    imageUploadId: uploadRes.body.data.id,
                    categoryId: category.id,
                })
                .expect(201);

            expect(res.body.data.imageUrl).toBe(uploadRes.body.data.url);

            const storedUpload = await prisma.upload.findUnique({
                where: { id: uploadRes.body.data.id },
            });
            expect(storedUpload?.status).toBe(UploadStatus.USED);
        });

        it('PATCH /users/:id — consumes an upload for profile image updates', async () => {
            const uploadRes = await uploadTestImage(
                customerToken,
                'profile.png',
            ).expect(201);

            const res = await request(app.getHttpServer())
                .patch(`/api/v1/users/${customerUserId}`)
                .set('Authorization', `Bearer ${customerToken}`)
                .send({
                    imageUploadId: uploadRes.body.data.id,
                })
                .expect(200);

            expect(res.body.data.profileImageUrl).toBe(uploadRes.body.data.url);

            const storedUpload = await prisma.upload.findUnique({
                where: { id: uploadRes.body.data.id },
            });
            expect(storedUpload?.status).toBe(UploadStatus.USED);
        });
    });

    // ===== WISHLIST =====

    describe('Wishlist', () => {
        let productId: string;

        beforeEach(async () => {
            const category = await prisma.category.create({
                data: { name: 'Wishlist Category' },
            });
            const product = await prisma.product.create({
                data: {
                    name: 'Wishlist Product',
                    price: 59.99,
                    stockQuantity: 3,
                    categoryId: category.id,
                },
            });
            productId = product.id;
        });

        it('GET /wishlist — creates and returns the current users wishlist', async () => {
            const res = await request(app.getHttpServer())
                .get('/api/v1/wishlist')
                .set('Authorization', `Bearer ${customerToken}`)
                .expect(200);

            expect(res.body.success).toBe(true);
            expect(res.body.data.userId).toBe(customerUserId);
            expect(res.body.data.items).toEqual([]);
        });

        it('POST /wishlist — adds a product and avoids duplicate entries', async () => {
            const firstRes = await request(app.getHttpServer())
                .post('/api/v1/wishlist')
                .set('Authorization', `Bearer ${customerToken}`)
                .send({ productId })
                .expect(201);

            expect(firstRes.body.data.items).toHaveLength(1);
            expect(firstRes.body.data.items[0].productId).toBe(productId);

            const secondRes = await request(app.getHttpServer())
                .post('/api/v1/wishlist')
                .set('Authorization', `Bearer ${customerToken}`)
                .send({ productId })
                .expect(201);

            expect(secondRes.body.data.items).toHaveLength(1);
        });

        it('DELETE /wishlist/:productId — removes an existing wishlist item', async () => {
            await request(app.getHttpServer())
                .post('/api/v1/wishlist')
                .set('Authorization', `Bearer ${customerToken}`)
                .send({ productId })
                .expect(201);

            const res = await request(app.getHttpServer())
                .delete(`/api/v1/wishlist/${productId}`)
                .set('Authorization', `Bearer ${customerToken}`)
                .expect(200);

            expect(res.body.data.items).toEqual([]);
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
