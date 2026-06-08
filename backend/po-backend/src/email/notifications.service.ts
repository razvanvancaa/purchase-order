import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole } from 'src/users/user.entity';
import { PurchaseOrder, POStatus } from 'src/purchase-orders/purchase-order.entity';
import { EmailService } from './email.service';

@Injectable()
export class NotificationsService {
  constructor(
    private emailService: EmailService,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async notifyRequesterStatusChange(po: PurchaseOrder, comment?: string): Promise<void> {
    const requester = po.createdBy;
    await this.emailService.send(
      requester.email,
      `PO "${po.title}" — status updated`,
      this.emailService.statusChangeHtml(po.title, po.status, comment),
    );
  }

  async notifyFinanceTeam(po: PurchaseOrder): Promise<void> {
    if (po.status !== POStatus.PENDING_FINANCE) return;
    const financeUsers = await this.userRepository.find({
      where: { role: UserRole.FINANCE },
    });
    if (!financeUsers.length) return;
    const emails = financeUsers.map((u) => u.email);
    await this.emailService.send(
      emails,
      `PO "${po.title}" requires Finance review`,
      this.emailService.financeReviewHtml(po.title, po.amount, po.createdBy.name),
    );
  }

  async notifyOnApprove(po: PurchaseOrder): Promise<void> {
    await this.notifyRequesterStatusChange(po);
    await this.notifyFinanceTeam(po);
  }

  async notifyOnReject(po: PurchaseOrder, comment: string): Promise<void> {
    await this.notifyRequesterStatusChange(po, comment);
  }

  async notifyBudgetUpdate(userEmail: string, userName: string, limit: number, year: number): Promise<void> {
    await this.emailService.send(
      userEmail,
      `Your annual budget for ${year} has been updated`,
      this.emailService.budgetUpdateHtml(userName, limit, year),
    );
  }

  async notifyManagersBudgetRequest(requesterName: string, requesterEmail: string, description: string, currentLimit: number | null): Promise<void> {
    const managers = await this.userRepository.find({ where: { role: UserRole.MANAGER } });
    if (!managers.length) return;
    const emails = managers.map((m) => m.email);
    await this.emailService.send(
      emails,
      `Budget supplement request from ${requesterName}`,
      this.emailService.budgetRequestHtml(requesterName, requesterEmail, description, currentLimit),
    );
  }
}
