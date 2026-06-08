import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Budget } from './budget.entity';
import { SetBudgetDto } from './dto/set-budget.dto';

@Injectable()
export class BudgetsService {
  constructor(
    @InjectRepository(Budget)
    private budgetRepository: Repository<Budget>,
  ) {}

  async setBudget(dto: SetBudgetDto): Promise<Budget> {
    const year = dto.year ?? new Date().getFullYear();
    let budget = await this.budgetRepository.findOne({
      where: { user: { id: dto.userId }, year },
    });

    if (budget) {
      budget.annual_limit = dto.annual_limit;
    } else {
      budget = this.budgetRepository.create({
        user: { id: dto.userId } as any,
        year,
        annual_limit: dto.annual_limit,
        used_amount: 0,
      });
    }

    return this.budgetRepository.save(budget);
  }

  async getBudgetForUser(userId: string, year?: number): Promise<Budget | null> {
    return this.budgetRepository.findOne({
      where: { user: { id: userId }, year: year ?? new Date().getFullYear() },
    });
  }

  async getAllBudgets(year?: number): Promise<Budget[]> {
    return this.budgetRepository.find({
      where: { year: year ?? new Date().getFullYear() },
      relations: { user: true },
    });
  }

  async addUsedAmount(userId: string, amount: number): Promise<void> {
    const year = new Date().getFullYear();
    const budget = await this.getBudgetForUser(userId, year);
    if (!budget) return;
    budget.used_amount = Number(budget.used_amount) + amount;
    await this.budgetRepository.save(budget);
  }

  getRemainingBudget(budget: Budget): number {
    return Number(budget.annual_limit) - Number(budget.used_amount);
  }
}
