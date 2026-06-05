import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PurchaseOrder } from './purchase-order.entity';
import { POHistory } from '../po-history/po-history.entity';
import { PurchaseOrdersService } from './purchase-orders.service';
import { PurchaseOrdersController } from './purchase-order.controller';


@Module({
    imports: [TypeOrmModule.forFeature([PurchaseOrder, POHistory])],
    controllers: [PurchaseOrdersController],
    providers: [PurchaseOrdersService],
})
export class PurchaseOrdersModule { }