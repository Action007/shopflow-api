import { Module } from "@nestjs/common";
import { CartModule } from "src/cart/cart.module";
import { PrismaModule } from "src/prisma/prisma.module";
import { OrderService } from "./order.service";
import { OrderController } from "./order.controller";

@Module({
    imports: [PrismaModule, CartModule],
    controllers: [OrderController],
    providers: [OrderService],
})
export class OrderModule {}
