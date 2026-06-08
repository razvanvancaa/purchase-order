import { Injectable, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BudgetRequest } from './budget-request.entity';
import { User } from 'src/users/user.entity';
import { BudgetsService } from './budgets.service';
import { NotificationsService } from 'src/email/notifications.service';

@Injectable()
export class BudgetRequestsService {
  private readonly logger = new Logger(BudgetRequestsService.name);

  constructor(
    @InjectRepository(BudgetRequest)
    private requestRepository: Repository<BudgetRequest>,
    private budgetsService: BudgetsService,
    private notificationsService: NotificationsService,
  ) {}

  async create(user: User, description: string, requestedLimit?: number): Promise<BudgetRequest> {
    const pending = await this.requestRepository.findOne({
      where: { requester: { id: user.id }, status: 'PENDING' },
    });
    if (pending) throw new ForbiddenException('You already have a pending request.');

    const budget = await this.budgetsService.getBudgetForUser(user.id);

    const req = this.requestRepository.create({
      requester: user,
      description,
      requestedLimit: requestedLimit ?? null,
      status: 'PENDING',
    });
    const saved = await this.requestRepository.save(req);

    this.notificationsService
      .notifyManagersBudgetRequest(user.name, user.email, description, budget ? Number(budget.annual_limit) : null)
      .catch((err) => this.logger.error(`Failed to send budget request notification: ${err.message}`));

    return saved;
  }

  findAll(): Promise<BudgetRequest[]> {
    return this.requestRepository.find({ order: { createdAt: 'DESC' } });
  }

  findForUser(userId: string): Promise<BudgetRequest[]> {
    return this.requestRepository.find({
      where: { requester: { id: userId } },
      order: { createdAt: 'DESC' },
    });
  }

  async approve(id: string, reviewer: User, newLimit: number): Promise<BudgetRequest> {
    const req = await this.requestRepository.findOne({
      where: { id },
      relations: { requester: true },
    });
    if (!req) throw new NotFoundException('Request not found.');
    if (req.status !== 'PENDING') throw new ForbiddenException('Request already reviewed.');

    req.status = 'APPROVED';
    req.approvedLimit = newLimit;
    req.reviewedBy = reviewer;
    const saved = await this.requestRepository.save(req);

    await this.budgetsService.setBudget({ userId: req.requester.id, annual_limit: newLimit });

    this.notificationsService
      .notifyBudgetUpdate(req.requester.email, req.requester.name, newLimit, new Date().getFullYear())
      .catch((err) => this.logger.error(`Failed to notify budget approval: ${err.message}`));

    return saved;
  }

  async reject(id: string, reviewer: User, comment: string): Promise<BudgetRequest> {
    const req = await this.requestRepository.findOne({
      where: { id },
      relations: { requester: true },
    });
    if (!req) throw new NotFoundException('Request not found.');
    if (req.status !== 'PENDING') throw new ForbiddenException('Request already reviewed.');

    req.status = 'REJECTED';
    req.comment = comment;
    req.reviewedBy = reviewer;
    const saved = await this.requestRepository.save(req);

    this.notificationsService
      .notifyBudgetRequestRejected(req.requester.email, req.requester.name, comment)
      .catch((err) => this.logger.error(`Failed to notify budget rejection: ${err.message}`));

    return saved;
  }
}
