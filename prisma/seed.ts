import { OrderStatus, PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();
const APP_BASE_URL = process.env.APP_BASE_URL ?? 'http://localhost:3000';

function uploadUrl(fileName: string): string {
    return `${APP_BASE_URL}/uploads/${fileName}`;
}

async function main() {
    console.log('Seeding database...');

    await prisma.orderItem.deleteMany();
    await prisma.order.deleteMany();
    await prisma.cartItem.deleteMany();
    await prisma.cart.deleteMany();
    await prisma.wishlistItem.deleteMany();
    await prisma.wishlist.deleteMany();
    await prisma.refreshToken.deleteMany();
    await prisma.product.deleteMany();
    await prisma.upload.deleteMany();
    await prisma.category.deleteMany();
    await prisma.user.deleteMany();

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

    const customer = await prisma.user.create({
        data: {
            firstName: 'John',
            lastName: 'Doe',
            email: 'john@example.com',
            password: hashedPassword,
            role: Role.CUSTOMER,
        },
    });

    const customer2 = await prisma.user.create({
        data: {
            firstName: 'Jane',
            lastName: 'Smith',
            email: 'jane@example.com',
            password: hashedPassword,
            role: Role.CUSTOMER,
        },
    });

    console.log(`Created users: ${admin.email}, ${customer.email}, ${customer2.email}`);

    const mobile = await prisma.category.create({
        data: {
            name: 'Mobile',
            description: 'Phones and mobile-first accessories',
        },
    });
    const wearables = await prisma.category.create({
        data: {
            name: 'Wearables',
            description: 'Smartwatches and fitness-focused devices',
        },
    });
    const computers = await prisma.category.create({
        data: {
            name: 'Computers',
            description: 'Computers, components, and peripherals',
        },
    });
    const audio = await prisma.category.create({
        data: {
            name: 'Audio',
            description: 'Personal audio and speakers',
        },
    });
    const gaming = await prisma.category.create({
        data: {
            name: 'Gaming',
            description: 'Consoles and gaming accessories',
        },
    });
    const smartHome = await prisma.category.create({
        data: {
            name: 'Smart Home',
            description: 'Connected home devices and automation',
        },
    });

    const smartphones = await prisma.category.create({
        data: {
            name: 'Smartphones',
            description: 'Flagship and mainstream smartphones',
            parentId: mobile.id,
        },
    });
    const mobileAccessories = await prisma.category.create({
        data: {
            name: 'Mobile Accessories',
            description: 'Audio, charging, and power accessories',
            parentId: mobile.id,
        },
    });
    const smartwatches = await prisma.category.create({
        data: {
            name: 'Smartwatches',
            description: 'Wrist-worn smart devices',
            parentId: wearables.id,
        },
    });
    const fitnessBands = await prisma.category.create({
        data: {
            name: 'Fitness Bands',
            description: 'Slim activity and health trackers',
            parentId: wearables.id,
        },
    });
    const laptops = await prisma.category.create({
        data: {
            name: 'Laptops',
            description: 'Portable computers for work and play',
            parentId: computers.id,
        },
    });
    const tablets = await prisma.category.create({
        data: {
            name: 'Tablets',
            description: 'Large-screen mobile computers',
            parentId: computers.id,
        },
    });
    const computerComponents = await prisma.category.create({
        data: {
            name: 'Components',
            description: 'Upgrade parts for PC builds',
            parentId: computers.id,
        },
    });
    const computerAccessories = await prisma.category.create({
        data: {
            name: 'Computer Accessories',
            description: 'Input devices and displays',
            parentId: computers.id,
        },
    });
    const headphones = await prisma.category.create({
        data: {
            name: 'Headphones',
            description: 'Over-ear and immersive listening',
            parentId: audio.id,
        },
    });
    const speakers = await prisma.category.create({
        data: {
            name: 'Speakers',
            description: 'Portable and home speakers',
            parentId: audio.id,
        },
    });
    const consoles = await prisma.category.create({
        data: {
            name: 'Consoles',
            description: 'Current generation gaming systems',
            parentId: gaming.id,
        },
    });
    const gamingAccessories = await prisma.category.create({
        data: {
            name: 'Gaming Accessories',
            description: 'Controllers and gaming add-ons',
            parentId: gaming.id,
        },
    });
    const security = await prisma.category.create({
        data: {
            name: 'Security',
            description: 'Cameras and monitoring devices',
            parentId: smartHome.id,
        },
    });
    const lighting = await prisma.category.create({
        data: {
            name: 'Lighting',
            description: 'Connected bulbs and ambient lighting',
            parentId: smartHome.id,
        },
    });

    const mobileAudio = await prisma.category.create({
        data: {
            name: 'Mobile Audio',
            description: 'Earbuds and mobile listening gear',
            parentId: mobileAccessories.id,
        },
    });
    const mobileCharging = await prisma.category.create({
        data: {
            name: 'Charging',
            description: 'Chargers and charging pads',
            parentId: mobileAccessories.id,
        },
    });
    const mobilePower = await prisma.category.create({
        data: {
            name: 'Power',
            description: 'Power banks and portable battery gear',
            parentId: mobileAccessories.id,
        },
    });
    const storage = await prisma.category.create({
        data: {
            name: 'Storage',
            description: 'Internal and external storage upgrades',
            parentId: computerComponents.id,
        },
    });
    const cpu = await prisma.category.create({
        data: {
            name: 'CPU',
            description: 'Desktop processors',
            parentId: computerComponents.id,
        },
    });
    const gpu = await prisma.category.create({
        data: {
            name: 'GPU',
            description: 'Graphics cards for gaming and creators',
            parentId: computerComponents.id,
        },
    });
    const input = await prisma.category.create({
        data: {
            name: 'Input',
            description: 'Keyboards, mice, and control devices',
            parentId: computerAccessories.id,
        },
    });
    const displays = await prisma.category.create({
        data: {
            name: 'Displays',
            description: 'Monitors and display accessories',
            parentId: computerAccessories.id,
        },
    });

    console.log('Created category tree with 6 root categories and 24 total categories');

    const productsData = [
        {
            name: 'iPhone 17 Pro',
            description:
                'Apple flagship smartphone with a premium camera system, fast performance, and a polished everyday experience.',
            price: '1099.99',
            stockQuantity: 24,
            categoryId: smartphones.id,
            imageUrl: uploadUrl('iphone-17-pro.png'),
        },
        {
            name: 'iPhone 17',
            description:
                'A balanced iPhone with strong battery life, smooth performance, and an approachable flagship feature set.',
            price: '899.99',
            stockQuantity: 38,
            categoryId: smartphones.id,
            imageUrl: uploadUrl('iphone-17.png'),
        },
        {
            name: 'Samsung Galaxy S26 Ultra',
            description:
                'Samsung premium large-format phone with a high-resolution camera array and top-tier mobile hardware.',
            price: '1299.99',
            stockQuantity: 18,
            categoryId: smartphones.id,
            imageUrl: uploadUrl('samsung-S26-ultra.png'),
        },
        {
            name: 'AirPods Pro 2',
            description:
                'Wireless earbuds with active noise cancellation, transparency mode, and compact all-day portability.',
            price: '249.99',
            stockQuantity: 75,
            categoryId: mobileAudio.id,
            imageUrl: uploadUrl('airpods-pro-2.png'),
        },
        {
            name: 'Anker 65W GaN Charger',
            description:
                'Compact fast charger that can power phones, tablets, and many laptops from a single GaN brick.',
            price: '59.99',
            stockQuantity: 90,
            categoryId: mobileCharging.id,
            imageUrl: uploadUrl('anker-65w-gan-charger.webp'),
        },
        {
            name: 'Belkin Wireless Charging Pad',
            description:
                'Qi-compatible charging pad for a clean desk or bedside setup with cable-free phone charging.',
            price: '39.99',
            stockQuantity: 64,
            categoryId: mobileCharging.id,
            imageUrl: uploadUrl('belkin-wireless-charging-pad.webp'),
        },
        {
            name: 'Xiaomi 20,000mAh Power Bank',
            description:
                'High-capacity portable battery built for travel days, commutes, and emergency top-ups.',
            price: '49.99',
            stockQuantity: 56,
            categoryId: mobilePower.id,
            imageUrl: uploadUrl('xiaomi-power-pank.png'),
        },
        {
            name: 'Apple Watch Ultra 2',
            description:
                'Rugged premium smartwatch with strong fitness features, bright display, and long-lasting battery.',
            price: '799.99',
            stockQuantity: 21,
            categoryId: smartwatches.id,
            imageUrl: uploadUrl('apple-watch-ultra-2.png'),
        },
        {
            name: 'Samsung Galaxy Watch 7',
            description:
                'Samsung smartwatch with health tracking, smart notifications, and a polished Wear OS experience.',
            price: '299.99',
            stockQuantity: 44,
            categoryId: smartwatches.id,
            imageUrl: uploadUrl('samsung-galaxy-watch-7.png'),
        },
        {
            name: 'Fitbit Charge 6',
            description:
                'Slim fitness band focused on workouts, sleep tracking, step counts, and daily health insights.',
            price: '159.99',
            stockQuantity: 48,
            categoryId: fitnessBands.id,
            imageUrl: uploadUrl('fitbit-charge-6.png'),
        },
        {
            name: 'MacBook Pro M4',
            description:
                'High-performance Apple laptop for development, creative work, and demanding daily workflows.',
            price: '1999.99',
            stockQuantity: 16,
            categoryId: laptops.id,
            imageUrl: uploadUrl('macbook-pro-m4.png'),
        },
        {
            name: 'iPad Pro 13',
            description:
                'Large premium tablet built for drawing, media, multitasking, and high-end mobile productivity.',
            price: '1299.99',
            stockQuantity: 27,
            categoryId: tablets.id,
            imageUrl: uploadUrl('ipad-pro-13.png'),
        },
        {
            name: 'Samsung 990 Pro NVMe SSD',
            description:
                'Fast NVMe storage upgrade with strong sustained performance for gaming and creator workloads.',
            price: '179.99',
            stockQuantity: 52,
            categoryId: storage.id,
            imageUrl: uploadUrl('samsung-990-pro-nvme-ssd.png'),
        },
        {
            name: 'WD Blue SATA SSD',
            description:
                'Dependable SATA SSD for breathing new life into older desktops and laptops.',
            price: '79.99',
            stockQuantity: 70,
            categoryId: storage.id,
            imageUrl: uploadUrl('wd-blue-sata-ssd.png'),
        },
        {
            name: 'Seagate Barracuda HDD',
            description:
                'Large-capacity hard drive designed for budget storage expansion and media archives.',
            price: '69.99',
            stockQuantity: 61,
            categoryId: storage.id,
            imageUrl: uploadUrl('seagate-barracuda-hhd.png'),
        },
        {
            name: 'Intel Core i7-14700K',
            description:
                'Unlocked desktop processor with strong mixed gaming and productivity performance.',
            price: '419.99',
            stockQuantity: 33,
            categoryId: cpu.id,
            imageUrl: uploadUrl('intel-core-i7-14700k.png'),
        },
        {
            name: 'AMD Ryzen 7 7800X3D',
            description:
                'Top-tier gaming CPU known for excellent efficiency and standout in-game frame rates.',
            price: '399.99',
            stockQuantity: 29,
            categoryId: cpu.id,
            imageUrl: uploadUrl('amd-Ryzen-7-9800X3d.png'),
        },
        {
            name: 'NVIDIA RTX 4070',
            description:
                'Modern graphics card for high-refresh 1440p gaming, creator apps, and ray tracing workloads.',
            price: '599.99',
            stockQuantity: 14,
            categoryId: gpu.id,
            imageUrl: uploadUrl('asus-rog-strix-geforce-rtx-5070.png'),
        },
        {
            name: 'AMD Radeon RX 7800 XT',
            description:
                'Powerful AMD graphics card aimed at smooth 1440p gaming and strong raster performance.',
            price: '549.99',
            stockQuantity: 17,
            categoryId: gpu.id,
            imageUrl: uploadUrl('asrock-amdradeon-rx-7800.png'),
        },
        {
            name: 'Logitech MX Master 3S Mouse',
            description:
                'Comfort-focused productivity mouse with quiet clicks, precision scrolling, and multi-device support.',
            price: '99.99',
            stockQuantity: 42,
            categoryId: input.id,
            imageUrl: uploadUrl('logitech-mx-master-3s-mouse.webp'),
        },
        {
            name: 'Keychron K6 Mechanical Keyboard',
            description:
                'Compact wireless mechanical keyboard with a clean layout and satisfying typing feel.',
            price: '89.99',
            stockQuantity: 39,
            categoryId: input.id,
            imageUrl: uploadUrl('keychron-k6-mechanical-keyboard.webp'),
        },
        {
            name: 'Dell UltraSharp 27 Monitor',
            description:
                'Color-accurate 27-inch monitor built for office work, design tasks, and everyday clarity.',
            price: '329.99',
            stockQuantity: 26,
            categoryId: displays.id,
            imageUrl: uploadUrl('dell-ultraSharp-27-monitor.png'),
        },
        {
            name: 'LG UltraWide Curved Monitor',
            description:
                'Immersive ultrawide display for multitasking, entertainment, and a more cinematic setup.',
            price: '449.99',
            stockQuantity: 19,
            categoryId: displays.id,
            imageUrl: uploadUrl('lg-ultrawide-curved-monitor.webp'),
        },
        {
            name: 'Sony WH-1000XM5',
            description:
                'Premium wireless headphones with excellent noise cancellation and a refined sound profile.',
            price: '379.99',
            stockQuantity: 31,
            categoryId: headphones.id,
            imageUrl: uploadUrl('sony-wh-1000xm5.webp'),
        },
        {
            name: 'JBL Charge 5',
            description:
                'Portable Bluetooth speaker with punchy sound, rugged build, and outdoor-friendly battery life.',
            price: '179.99',
            stockQuantity: 36,
            categoryId: speakers.id,
            imageUrl: uploadUrl('jbl-charge-5.png'),
        },
        {
            name: 'PlayStation 5',
            description:
                'Sony current-generation console with fast load times and a strong first-party game lineup.',
            price: '499.99',
            stockQuantity: 12,
            categoryId: consoles.id,
            imageUrl: uploadUrl('playstation-5.png'),
        },
        {
            name: 'Xbox Series X',
            description:
                'Microsoft flagship console offering excellent performance, Game Pass value, and quick resume.',
            price: '499.99',
            stockQuantity: 13,
            categoryId: consoles.id,
            imageUrl: uploadUrl('xbox-series-x.png'),
        },
        {
            name: 'DualSense Wireless Controller',
            description:
                'PlayStation controller with adaptive triggers, haptics, and a familiar ergonomic design.',
            price: '69.99',
            stockQuantity: 47,
            categoryId: gamingAccessories.id,
            imageUrl: uploadUrl('dualsense-wireless-controller.webp'),
        },
        {
            name: 'Ring Indoor Cam',
            description:
                'Compact indoor security camera for live viewing, alerts, and simple home monitoring.',
            price: '59.99',
            stockQuantity: 54,
            categoryId: security.id,
            imageUrl: uploadUrl('ring-indoor-cam.webp'),
        },
        {
            name: 'Philips Hue Smart Bulb',
            description:
                'Connected smart bulb for scenes, scheduling, and app-based lighting control throughout the home.',
            price: '49.99',
            stockQuantity: 83,
            categoryId: lighting.id,
            imageUrl: uploadUrl('philips-hue-smart-bulb.png'),
        },
    ];

    const products = await Promise.all(
        productsData.map((product) =>
            prisma.product.create({
                data: product,
            }),
        ),
    );

    console.log(`Created ${products.length} products with local upload-backed image URLs`);

    const productByName = new Map(products.map((product) => [product.name, product]));
    const getProduct = (name: string) => {
        const product = productByName.get(name);
        if (!product) {
            throw new Error(`Missing seeded product required for relational fixtures: ${name}`);
        }
        return product;
    };

    const iphone17Pro = getProduct('iPhone 17 Pro');
    const macbookPro = getProduct('MacBook Pro M4');
    const airpodsPro = getProduct('AirPods Pro 2');
    const galaxyWatch = getProduct('Samsung Galaxy Watch 7');
    const keychronK6 = getProduct('Keychron K6 Mechanical Keyboard');
    const dellMonitor = getProduct('Dell UltraSharp 27 Monitor');
    const jblCharge = getProduct('JBL Charge 5');
    const ps5 = getProduct('PlayStation 5');
    const hueBulb = getProduct('Philips Hue Smart Bulb');
    const mxMaster = getProduct('Logitech MX Master 3S Mouse');
    const ringCam = getProduct('Ring Indoor Cam');

    await prisma.cart.create({
        data: {
            userId: customer.id,
            items: {
                create: [
                    {
                        productId: hueBulb.id,
                        quantity: 2,
                        priceAtAdd: hueBulb.price,
                    },
                    {
                        productId: keychronK6.id,
                        quantity: 1,
                        priceAtAdd: keychronK6.price,
                    },
                ],
            },
        },
    });

    await prisma.cart.create({
        data: {
            userId: customer2.id,
            items: {
                create: [
                    {
                        productId: jblCharge.id,
                        quantity: 1,
                        priceAtAdd: jblCharge.price,
                    },
                    {
                        productId: ringCam.id,
                        quantity: 1,
                        priceAtAdd: ringCam.price,
                    },
                ],
            },
        },
    });

    await prisma.wishlist.create({
        data: {
            userId: customer.id,
            items: {
                create: [
                    {
                        productId: ps5.id,
                    },
                    {
                        productId: dellMonitor.id,
                    },
                ],
            },
        },
    });

    await prisma.wishlist.create({
        data: {
            userId: customer2.id,
            items: {
                create: [
                    {
                        productId: iphone17Pro.id,
                    },
                    {
                        productId: macbookPro.id,
                    },
                    {
                        productId: mxMaster.id,
                    },
                ],
            },
        },
    });

    type SeedOrderItem = {
        product: (typeof products)[number];
        quantity: number;
    };

    type SeedOrder = {
        orderNumber: string;
        userId: string;
        status: OrderStatus;
        shippingAddress: string;
        createdAt: Date;
        paidAt?: Date;
        items: SeedOrderItem[];
    };

    const ordersSeed: SeedOrder[] = [
        {
            orderNumber: 'ORD-2025-0001',
            userId: customer.id,
            status: OrderStatus.DELIVERED,
            shippingAddress: '123 Main Street, New York, NY 10001, USA',
            paidAt: new Date('2025-03-10T10:00:00Z'),
            createdAt: new Date('2025-03-10T09:00:00Z'),
            items: [{ product: iphone17Pro, quantity: 1 }],
        },
        {
            orderNumber: 'ORD-2025-0002',
            userId: customer.id,
            status: OrderStatus.SHIPPED,
            shippingAddress: '123 Main Street, New York, NY 10001, USA',
            paidAt: new Date('2025-04-01T14:00:00Z'),
            createdAt: new Date('2025-04-01T13:00:00Z'),
            items: [
                { product: macbookPro, quantity: 1 },
                { product: airpodsPro, quantity: 1 },
            ],
        },
        {
            orderNumber: 'ORD-2025-0003',
            userId: customer.id,
            status: OrderStatus.PENDING,
            shippingAddress: '123 Main Street, New York, NY 10001, USA',
            createdAt: new Date('2025-04-16T09:30:00Z'),
            items: [{ product: airpodsPro, quantity: 2 }],
        },
        {
            orderNumber: 'ORD-2025-0004',
            userId: customer.id,
            status: OrderStatus.PROCESSING,
            shippingAddress: '123 Main Street, New York, NY 10001, USA',
            paidAt: new Date('2025-04-12T12:00:00Z'),
            createdAt: new Date('2025-04-12T11:15:00Z'),
            items: [
                { product: keychronK6, quantity: 1 },
                { product: mxMaster, quantity: 1 },
                { product: dellMonitor, quantity: 1 },
            ],
        },
        {
            orderNumber: 'ORD-2025-0005',
            userId: customer2.id,
            status: OrderStatus.DELIVERED,
            shippingAddress: '45 Park Avenue, Brooklyn, NY 11201, USA',
            paidAt: new Date('2025-02-18T16:45:00Z'),
            createdAt: new Date('2025-02-18T15:30:00Z'),
            items: [
                { product: galaxyWatch, quantity: 1 },
                { product: jblCharge, quantity: 1 },
            ],
        },
        {
            orderNumber: 'ORD-2025-0006',
            userId: customer2.id,
            status: OrderStatus.CANCELLED,
            shippingAddress: '45 Park Avenue, Brooklyn, NY 11201, USA',
            createdAt: new Date('2025-03-22T08:20:00Z'),
            items: [{ product: ps5, quantity: 1 }],
        },
        {
            orderNumber: 'ORD-2025-0007',
            userId: customer2.id,
            status: OrderStatus.SHIPPED,
            shippingAddress: '45 Park Avenue, Brooklyn, NY 11201, USA',
            paidAt: new Date('2025-04-08T09:10:00Z'),
            createdAt: new Date('2025-04-08T08:40:00Z'),
            items: [
                { product: hueBulb, quantity: 4 },
                { product: ringCam, quantity: 1 },
            ],
        },
        {
            orderNumber: 'ORD-2025-0008',
            userId: customer2.id,
            status: OrderStatus.PENDING,
            shippingAddress: '45 Park Avenue, Brooklyn, NY 11201, USA',
            createdAt: new Date('2025-04-16T10:15:00Z'),
            items: [{ product: iphone17Pro, quantity: 1 }],
        },
    ];

    for (const order of ordersSeed) {
        const totalAmount = order.items.reduce(
            (sum, item) => sum + Number(item.product.price) * item.quantity,
            0,
        );

        await prisma.order.create({
            data: {
                orderNumber: order.orderNumber,
                userId: order.userId,
                status: order.status,
                totalAmount,
                shippingAddress: order.shippingAddress,
                paidAt: order.paidAt,
                createdAt: order.createdAt,
                items: {
                    create: order.items.map((item) => ({
                        productId: item.product.id,
                        quantity: item.quantity,
                        priceAtPurchase: item.product.price,
                        productNameAtPurchase: item.product.name,
                    })),
                },
            },
        });
    }

    console.log(`Created ${ordersSeed.length} orders across ${customer.email} and ${customer2.email}`);
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
