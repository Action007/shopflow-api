import { PrismaClient, Role, OrderStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
    console.log('Seeding database...');

    // Clean existing data (FK-safe order)
    await prisma.orderItem.deleteMany();
    await prisma.order.deleteMany();
    await prisma.cartItem.deleteMany();
    await prisma.cart.deleteMany();
    await prisma.wishlistItem.deleteMany();
    await prisma.wishlist.deleteMany();
    await prisma.refreshToken.deleteMany();
    await prisma.product.deleteMany();
    await prisma.category.deleteMany();
    await prisma.user.deleteMany();

    // ─── Users ───────────────────────────────────────────────────────────────
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

    // ─── Categories ──────────────────────────────────────────────────────────
    const phones = await prisma.category.create({
        data: {
            name: 'Phones',
            description: 'Smartphones and mobile devices',
        },
    });

    const laptops = await prisma.category.create({
        data: {
            name: 'Laptops',
            description: 'Laptop computers and ultrabooks',
        },
    });

    const accessories = await prisma.category.create({
        data: {
            name: 'Accessories',
            description: 'Tech accessories and peripherals',
        },
    });

    const audio = await prisma.category.create({
        data: {
            name: 'Audio',
            description: 'Headphones, earbuds, and speakers',
        },
    });

    const wearables = await prisma.category.create({
        data: {
            name: 'Wearables',
            description: 'Smartwatches and fitness trackers',
        },
    });

    const iosPhones = await prisma.category.create({
        data: {
            name: 'iOS Phones',
            description: 'Apple iPhone models',
            parentId: phones.id,
        },
    });

    const androidPhones = await prisma.category.create({
        data: {
            name: 'Android Phones',
            description: 'Android smartphones from leading brands',
            parentId: phones.id,
        },
    });

    const professionalLaptops = await prisma.category.create({
        data: {
            name: 'Professional Laptops',
            description: 'High-performance laptops for work and creators',
            parentId: laptops.id,
        },
    });

    const tablets = await prisma.category.create({
        data: {
            name: 'Tablets',
            description: 'Tablets and large-screen portable devices',
            parentId: accessories.id,
        },
    });

    const earbuds = await prisma.category.create({
        data: {
            name: 'Earbuds',
            description: 'Compact in-ear wireless audio devices',
            parentId: audio.id,
        },
    });

    const headphones = await prisma.category.create({
        data: {
            name: 'Headphones',
            description: 'Over-ear and on-ear premium headphones',
            parentId: audio.id,
        },
    });

    const smartwatches = await prisma.category.create({
        data: {
            name: 'Smartwatches',
            description: 'Connected watches with health and fitness features',
            parentId: wearables.id,
        },
    });

    console.log('Created 12 categories including child categories');

    // ─── Products ─────────────────────────────────────────────────────────────
    const products = await Promise.all([
        // Phones
        prisma.product.create({
            data: {
                name: 'iPhone 17',
                description:
                    'Apple iPhone 17 with A19 chip, 48MP camera system, and all-day battery life. Available in 128GB and 256GB.',
                price: 899.99,
                stockQuantity: 60,
                categoryId: iosPhones.id,
                imageUrl:
                    'https://www.pngall.com/wp-content/uploads/17/iPhone-17-Enhanced-Performance-PNG.png',
            },
        }),
        prisma.product.create({
            data: {
                name: 'iPhone 17 Pro',
                description:
                    'Apple iPhone 17 Pro with A19 Pro chip, titanium design, pro camera system with 5x optical zoom.',
                price: 1099.99,
                stockQuantity: 45,
                categoryId: iosPhones.id,
                imageUrl:
                    'https://www.pngall.com/wp-content/uploads/17/iPhone-17-Enhanced-Audio-Quality-PNG.png',
            },
        }),
        prisma.product.create({
            data: {
                name: 'Samsung Galaxy S26 Ultra',
                description:
                    'Samsung Galaxy S26 Ultra with Snapdragon 8 Elite, 200MP camera, built-in S Pen, and 5000mAh battery.',
                price: 1299.99,
                stockQuantity: 30,
                categoryId: androidPhones.id,
                imageUrl:
                    'https://www.dxomark.com/wp-content/uploads/medias/post-190763/Samsung-S26-Ultra-png.png',
            },
        }),

        // Laptops
        prisma.product.create({
            data: {
                name: 'MacBook Pro M4',
                description:
                    'Apple MacBook Pro with M4 chip, 14-inch Liquid Retina XDR display, up to 24GB unified memory.',
                price: 1999.99,
                stockQuantity: 20,
                categoryId: professionalLaptops.id,
                imageUrl:
                    'https://www.pngall.com/wp-content/uploads/19/Macbook-Apple-Compact-Mobile-Computing-PNG.png',
            },
        }),
        prisma.product.create({
            data: {
                name: 'Dell XPS 15',
                description:
                    'Dell XPS 15 with Intel Core i9, 15.6-inch OLED InfinityEdge display, NVIDIA RTX 4060.',
                price: 1899.99,
                stockQuantity: 15,
                categoryId: professionalLaptops.id,
                imageUrl:
                    'https://w7.pngwing.com/pngs/910/21/png-transparent-laptop-dell-xps-15-computer-monitors-personal-computer-laptops-electronics-netbook-computer.png',
            },
        }),
        prisma.product.create({
            data: {
                name: 'iPad Pro 13"',
                description:
                    'Apple iPad Pro with M4 chip, 13-inch Ultra Retina XDR display, Apple Pencil Pro support.',
                price: 1299.99,
                stockQuantity: 25,
                categoryId: tablets.id,
                imageUrl:
                    'https://www.pngall.com/wp-content/uploads/15/iPad-Pro-PNG-Image.png',
            },
        }),

        // Audio
        prisma.product.create({
            data: {
                name: 'AirPods Pro 2',
                description:
                    'Apple AirPods Pro 2nd generation with Active Noise Cancellation, Transparency mode, and Adaptive Audio.',
                price: 249.99,
                stockQuantity: 80,
                categoryId: earbuds.id,
                imageUrl:
                    'https://www.citypng.com/public/uploads/preview/airpods-pro-2nd-generation-png-7040816946218451no0esezhy.png',
            },
        }),
        prisma.product.create({
            data: {
                name: 'AirPods Max',
                description:
                    'Apple AirPods Max with high-fidelity audio, Active Noise Cancellation, and up to 20 hours battery life.',
                price: 549.99,
                stockQuantity: 35,
                categoryId: headphones.id,
                imageUrl:
                    'https://www.apple.com/v/airpods-max/j/images/overview/product-stories/hifi-sound/modal/audio_bc_microphone__c4kgd4pga3cm_large.png',
            },
        }),
        prisma.product.create({
            data: {
                name: 'Sony WH-1000XM5',
                description:
                    'Sony WH-1000XM5 wireless headphones with industry-leading noise cancellation and 30-hour battery.',
                price: 379.99,
                stockQuantity: 40,
                categoryId: headphones.id,
                imageUrl:
                    'https://cdn.shopify.com/s/files/1/0397/7166/8635/products/WH1000XM5_Silver.png?v=1761235815',
            },
        }),

        // Wearables
        prisma.product.create({
            data: {
                name: 'Apple Watch Ultra 2',
                description:
                    'Apple Watch Ultra 2 with titanium case, precision dual-frequency GPS, up to 60 hours battery life.',
                price: 799.99,
                stockQuantity: 20,
                categoryId: smartwatches.id,
                imageUrl:
                    'https://cdsassets.apple.com/live/7WUAS350/images/tech-specs/111832-watch-ultra-2.png',
            },
        }),
        prisma.product.create({
            data: {
                name: 'Samsung Galaxy Watch 7',
                description:
                    'Samsung Galaxy Watch 7 with advanced health monitoring, sleep tracking, and 40-hour battery life.',
                price: 299.99,
                stockQuantity: 50,
                categoryId: smartwatches.id,
                imageUrl:
                    'https://www.vhv.rs/dpng/d/495-4951352_samsung-galaxy-watch-active-hd-png-download.png',
            },
        }),

        // Out of stock — for UI testing
        prisma.product.create({
            data: {
                name: 'MacBook Air M3',
                description:
                    'Apple MacBook Air with M3 chip, fanless design, 13.6-inch Liquid Retina display. Currently out of stock.',
                price: 1299.99,
                stockQuantity: 0,
                categoryId: professionalLaptops.id,
                imageUrl:
                    'https://www.pngall.com/wp-content/uploads/19/Macbook-Apple-Compact-Mobile-Computing-PNG.png',
            },
        }),
    ]);

    console.log(`Created ${products.length} products`);

    // ─── Orders (for John's order history) ───────────────────────────────────
    const iphone17 = products[0];
    const macbookPro = products[3];
    const airpodsPro = products[6];

    // Order 1 — DELIVERED
    const order1 = await prisma.order.create({
        data: {
            orderNumber: 'ORD-2025-0001',
            userId: customer.id,
            status: OrderStatus.DELIVERED,
            totalAmount: iphone17.price,
            shippingAddress: '123 Main Street, New York, NY 10001, USA',
            paidAt: new Date('2025-03-10T10:00:00Z'),
            createdAt: new Date('2025-03-10T09:00:00Z'),
            items: {
                create: [
                    {
                        productId: iphone17.id,
                        quantity: 1,
                        priceAtPurchase: iphone17.price,
                        productNameAtPurchase: iphone17.name,
                    },
                ],
            },
        },
    });

    // Order 2 — SHIPPED
    const order2 = await prisma.order.create({
        data: {
            orderNumber: 'ORD-2025-0002',
            userId: customer.id,
            status: OrderStatus.SHIPPED,
            totalAmount: Number(macbookPro.price) + Number(airpodsPro.price),
            shippingAddress: '123 Main Street, New York, NY 10001, USA',
            paidAt: new Date('2025-04-01T14:00:00Z'),
            createdAt: new Date('2025-04-01T13:00:00Z'),
            items: {
                create: [
                    {
                        productId: macbookPro.id,
                        quantity: 1,
                        priceAtPurchase: macbookPro.price,
                        productNameAtPurchase: macbookPro.name,
                    },
                    {
                        productId: airpodsPro.id,
                        quantity: 1,
                        priceAtPurchase: airpodsPro.price,
                        productNameAtPurchase: airpodsPro.name,
                    },
                ],
            },
        },
    });

    // Order 3 — PENDING (cancellable — for UI testing)
    const order3 = await prisma.order.create({
        data: {
            orderNumber: 'ORD-2025-0003',
            userId: customer.id,
            status: OrderStatus.PENDING,
            totalAmount: airpodsPro.price,
            shippingAddress: '123 Main Street, New York, NY 10001, USA',
            createdAt: new Date(),
            items: {
                create: [
                    {
                        productId: airpodsPro.id,
                        quantity: 2,
                        priceAtPurchase: airpodsPro.price,
                        productNameAtPurchase: airpodsPro.name,
                    },
                ],
            },
        },
    });

    console.log(`Created 3 orders for ${customer.email}`);

    console.log('\n✅ Seed complete!');
    console.log('─────────────────────────────────────');
    console.log('Admin:      admin@example.com / Password123!');
    console.log('Customer:   john@example.com  / Password123!');
    console.log('Customer 2: jane@example.com  / Password123!');
    console.log('─────────────────────────────────────');
}

main()
    .catch((e) => {
        console.error('Seed failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
