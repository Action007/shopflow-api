import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
    console.log('Seeding database...');

    // Clean existing data (order matters due to foreign keys)
    await prisma.orderItem.deleteMany();
    await prisma.order.deleteMany();
    await prisma.cartItem.deleteMany();
    await prisma.cart.deleteMany();
    await prisma.refreshToken.deleteMany();
    await prisma.product.deleteMany();
    await prisma.category.deleteMany();
    await prisma.user.deleteMany();

    // --- Users ---
    const hashedPassword = await bcrypt.hash('Password123!', 10);

    const admin = await prisma.user.create({
        data: {
            firstName: 'Admin',
            lastName: 'User',
            email: 'admin@example.com',
            password: hashedPassword,
            role: Role.ADMIN,
        },
    });
    console.log(`Created admin: ${admin.email}`);

    const customer = await prisma.user.create({
        data: {
            firstName: 'John',
            lastName: 'Doe',
            email: 'john@example.com',
            password: hashedPassword,
            role: Role.CUSTOMER,
        },
    });
    console.log(`Created customer: ${customer.email}`);

    const customer2 = await prisma.user.create({
        data: {
            firstName: 'Jane',
            lastName: 'Smith',
            email: 'jane@example.com',
            password: hashedPassword,
            role: Role.CUSTOMER,
        },
    });
    console.log(`Created customer: ${customer2.email}`);

    // --- Categories ---
    const electronics = await prisma.category.create({
        data: {
            name: 'Electronics',
            description: 'Electronic devices and gadgets',
        },
    });

    const laptops = await prisma.category.create({
        data: {
            name: 'Laptops',
            description: 'Laptop computers',
            parentId: electronics.id,
        },
    });

    const phones = await prisma.category.create({
        data: {
            name: 'Phones',
            description: 'Smartphones and accessories',
            parentId: electronics.id,
        },
    });

    const clothing = await prisma.category.create({
        data: {
            name: 'Clothing',
            description: 'Apparel and fashion',
        },
    });

    const accessories = await prisma.category.create({
        data: {
            name: 'Accessories',
            description: 'Fashion accessories',
            parentId: clothing.id,
        },
    });

    console.log('Created 5 categories');

    // --- Products ---
    const products = await Promise.all([
        prisma.product.create({
            data: {
                name: 'MacBook Pro 16"',
                description: 'Apple MacBook Pro with M3 chip, 16-inch display',
                price: 2499.99,
                stockQuantity: 15,
                categoryId: laptops.id,
            },
        }),
        prisma.product.create({
            data: {
                name: 'Dell XPS 15',
                description: 'Dell XPS 15 with Intel i9, 15.6-inch OLED',
                price: 1899.99,
                stockQuantity: 20,
                categoryId: laptops.id,
            },
        }),
        prisma.product.create({
            data: {
                name: 'ThinkPad X1 Carbon',
                description: 'Lenovo ThinkPad X1 Carbon Gen 11',
                price: 1649.99,
                stockQuantity: 12,
                categoryId: laptops.id,
            },
        }),
        prisma.product.create({
            data: {
                name: 'iPhone 15 Pro',
                description: 'Apple iPhone 15 Pro, 256GB',
                price: 999.99,
                stockQuantity: 50,
                categoryId: phones.id,
            },
        }),
        prisma.product.create({
            data: {
                name: 'Samsung Galaxy S24',
                description: 'Samsung Galaxy S24 Ultra, 512GB',
                price: 1199.99,
                stockQuantity: 35,
                categoryId: phones.id,
            },
        }),
        prisma.product.create({
            data: {
                name: 'Google Pixel 8',
                description: 'Google Pixel 8 Pro, 128GB',
                price: 899.99,
                stockQuantity: 25,
                categoryId: phones.id,
            },
        }),
        prisma.product.create({
            data: {
                name: 'AirPods Pro',
                description: 'Apple AirPods Pro 2nd generation',
                price: 249.99,
                stockQuantity: 100,
                categoryId: electronics.id,
            },
        }),
        prisma.product.create({
            data: {
                name: 'Leather Wallet',
                description: 'Genuine leather bifold wallet',
                price: 49.99,
                stockQuantity: 200,
                categoryId: accessories.id,
            },
        }),
        prisma.product.create({
            data: {
                name: 'Running Shoes',
                description: 'Lightweight performance running shoes',
                price: 129.99,
                stockQuantity: 75,
                categoryId: clothing.id,
            },
        }),
        prisma.product.create({
            data: {
                name: 'Winter Jacket',
                description: 'Insulated waterproof winter jacket',
                price: 199.99,
                stockQuantity: 40,
                categoryId: clothing.id,
            },
        }),
        prisma.product.create({
            data: {
                name: 'Sunglasses',
                description: 'Polarized UV protection sunglasses',
                price: 79.99,
                stockQuantity: 150,
                categoryId: accessories.id,
            },
        }),
        prisma.product.create({
            data: {
                name: 'Out of Stock Item',
                description: 'This product has no stock for testing',
                price: 9.99,
                stockQuantity: 0,
                categoryId: electronics.id,
            },
        }),
    ]);

    console.log(`Created ${products.length} products`);

    console.log('\nSeed complete!');
    console.log('Admin login: admin@example.com / Password123!');
    console.log('Customer login: john@example.com / Password123!');
    console.log('Customer 2 login: jane@example.com / Password123!');
}

main()
    .catch((e) => {
        console.error('Seed failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });