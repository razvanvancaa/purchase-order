import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PurchaseOrder } from './purchase-order.entity';

@Module({
    imports: [TypeOrmModule.forFeature([PurchaseOrder])],
})
export class PurchaseOrdersModule { }