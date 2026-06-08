import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PurchaseOrder } from './purchase-order.entity';
import { POHistory } from '../po-history/po-history.entity';
import { PurchaseOrdersService } from './purchase-orders.service';
import { PurchaseOrdersController } from './purchase-order.controller';
import { BudgetsModule } from '../budgets/budgets.module';
import { EmailModule } from '../email/email.module';


@Module({
    imports: [TypeOrmModule.forFeature([PurchaseOrder, POHistory]), BudgetsModule, EmailModule],
    controllers: [PurchaseOrdersController],
    providers: [PurchaseOrdersService],
})
export class PurchaseOrdersModule { }