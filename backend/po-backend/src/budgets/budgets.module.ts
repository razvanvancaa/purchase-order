import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Budget } from './budget.entity';
import { BudgetRequest } from './budget-request.entity';
import { BudgetsService } from './budgets.service';
import { BudgetsController } from './budgets.controller';
import { BudgetRequestsService } from './budget-requests.service';
import { BudgetRequestsController } from './budget-requests.controller';
import { EmailModule } from 'src/email/email.module';
import { User } from 'src/users/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Budget, BudgetRequest, User]), EmailModule],
  controllers: [BudgetsController, BudgetRequestsController],
  providers: [BudgetsService, BudgetRequestsService],
  exports: [BudgetsService],
})
export class BudgetsModule {}
