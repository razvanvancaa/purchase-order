import { Injectable, NotFoundException, ForbiddenException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { POHistory, POAction } from "src/po-history/po-history.entity";
import { User, UserRole } from "src/users/user.entity";
import { In, Repository } from "typeorm";
import { CreatePoDto } from "./dto/create-po.dto";
import { RejectPoDto } from "./dto/reject-po.dto";
import { UpdatePoDto } from "./dto/uptdate-po.dto";
import { PurchaseOrder, POStatus, POCategory } from "./purchase-order.entity";
import { BudgetsService } from "src/budgets/budgets.service";
import { NotificationsService } from "src/email/notifications.service";

@Injectable()
export class PurchaseOrdersService {
    constructor(
        @InjectRepository(PurchaseOrder)
        private poRepository: Repository<PurchaseOrder>,
        @InjectRepository(POHistory)
        private historyRepository: Repository<POHistory>,
        private budgetsService: BudgetsService,
        private notificationsService: NotificationsService,
    ) { }

    async create(dto: CreatePoDto, user: User): Promise<PurchaseOrder> {
        if (dto.amount > 2000) {
            const po = this.poRepository.create({
                ...dto,
                createdBy: user,
                status: POStatus.PERMANENTLY_REJECTED,
            });
            const saved = await this.poRepository.save(po);
            await this.saveHistory(saved, POAction.SUBMITTED, user, POStatus.PERMANENTLY_REJECTED, POStatus.PERMANENTLY_REJECTED);
            await this.saveHistory(saved, POAction.HARD_REJECTED, user, POStatus.PERMANENTLY_REJECTED, POStatus.PERMANENTLY_REJECTED, 'too expensive, budget exceeded');
            return saved;
        }

        const budget = await this.budgetsService.getBudgetForUser(user.id);
        if (budget && this.budgetsService.getRemainingBudget(budget) < dto.amount) {
            const po = this.poRepository.create({
                ...dto,
                createdBy: user,
                status: POStatus.PERMANENTLY_REJECTED,
            });
            const saved = await this.poRepository.save(po);
            await this.saveHistory(saved, POAction.SUBMITTED, user, POStatus.PERMANENTLY_REJECTED, POStatus.PERMANENTLY_REJECTED);
            await this.saveHistory(saved, POAction.HARD_REJECTED, user, POStatus.PERMANENTLY_REJECTED, POStatus.PERMANENTLY_REJECTED, 'annual budget exceeded');
            return saved;
        }

        const skipManager = user.role === UserRole.MANAGER || dto.amount < 100;
        const initialStatus = skipManager
            ? this.getNextStatusAfterManager({ category: dto.category } as PurchaseOrder)
            : POStatus.PENDING_MANAGER;

        const po = this.poRepository.create({
            ...dto,
            createdBy: user,
            status: initialStatus,
        });
        const saved = await this.poRepository.save(po);
        await this.saveHistory(saved, POAction.SUBMITTED, user, initialStatus, initialStatus);
        return saved;
    }

    async findAll(user: User, status?: string, category?: string): Promise<PurchaseOrder[]> {
        const base = this.getWhereClause(user);
        const extra: Partial<PurchaseOrder> = {};
        if (status) extra.status = status as POStatus;
        if (category) extra.category = category as POCategory;

        const where = Array.isArray(base)
            ? base.map((c) => ({ ...c, ...extra }))
            : { ...base, ...extra };

        return this.poRepository.find({ where, relations: { createdBy: true } });
    }

    async getNotifications(user: User): Promise<POHistory[]> {
        const since = new Date();
        since.setDate(since.getDate() - 14);
        return this.historyRepository
            .createQueryBuilder('h')
            .innerJoin('h.purchaseOrder', 'po')
            .innerJoin('po.createdBy', 'creator')
            .leftJoinAndSelect('h.purchaseOrder', 'po2')
            .leftJoinAndSelect('po2.createdBy', 'creator2')
            .where('creator.id = :userId', { userId: user.id })
            .andWhere('h.action IN (:...actions)', {
                actions: [POAction.APPROVED, POAction.REJECTED, POAction.HARD_REJECTED, POAction.INVOICED],
            })
            .andWhere('h.timestamp >= :since', { since })
            .orderBy('h.timestamp', 'DESC')
            .getMany();
    }

    async findOne(id: string, user: User): Promise<PurchaseOrder> {
        const clause = this.getWhereClause(user);
        const where = Array.isArray(clause)
            ? clause.map((c) => ({ ...c, id }))
            : { ...clause, id };

        const po = await this.poRepository.findOne({
            where,
            relations: { createdBy: true },
        });
        if (!po) throw new NotFoundException('Purchase Order not found');
        return po;
    }

    async update(
        id: string,
        dto: UpdatePoDto,
        user: User,
    ): Promise<PurchaseOrder> {
        const po = await this.findOne(id, user);

        if (po.createdBy.id !== user.id) throw new ForbiddenException();
        if (po.status !== POStatus.NEEDS_REWORK) {
            throw new ForbiddenException(
                'PO can only be edited when in NEEDS_REWORK status',
            );
        }

        const updatedAmount = dto.amount ?? po.amount;
        const updatedCategory = dto.category ?? po.category;

        if (updatedAmount > 2000) {
            Object.assign(po, dto, { status: POStatus.PERMANENTLY_REJECTED });
            const saved = await this.poRepository.save(po);
            await this.saveHistory(saved, POAction.REWORKED, user, POStatus.NEEDS_REWORK, POStatus.PERMANENTLY_REJECTED);
            await this.saveHistory(saved, POAction.HARD_REJECTED, user, POStatus.PERMANENTLY_REJECTED, POStatus.PERMANENTLY_REJECTED, 'too expensive, budget exceeded');
            return saved;
        }

        const skipManager = user.role === UserRole.MANAGER || updatedAmount < 100;
        const newStatus = skipManager
            ? this.getNextStatusAfterManager({ category: updatedCategory } as PurchaseOrder)
            : POStatus.PENDING_MANAGER;

        Object.assign(po, dto, { status: newStatus });
        const saved = await this.poRepository.save(po);
        await this.saveHistory(saved, POAction.REWORKED, user, POStatus.NEEDS_REWORK, newStatus);
        return saved;
    }

    private getWhereClause(user: User) {
        switch (user.role) {
            case UserRole.REQUESTER:
                return { createdBy: { id: user.id } };
            case UserRole.MANAGER:
                return { status: POStatus.PENDING_MANAGER };
            case UserRole.IT:
                return { status: POStatus.PENDING_IT };
            case UserRole.FINANCE:
                return [
                    { status: In([POStatus.PENDING_FINANCE, POStatus.INVOICED, POStatus.PERMANENTLY_REJECTED]) },
                    { createdBy: { id: user.id } },
                ];
            default:
                return {};
        }
    }

    async approve(id: string, user: User): Promise<PurchaseOrder> {
        const po = await this.findOne(id, user);
        this.validateApprover(po, user);

        const fromStatus = po.status;
        po.status = this.getNextStatus(po);
        await this.poRepository.save(po);
        await this.saveHistory(po, POAction.APPROVED, user, fromStatus, po.status);
        this.notificationsService.notifyOnApprove(po).catch(() => null);
        return po;
    }

    async reject(
        id: string,
        dto: RejectPoDto,
        user: User,
    ): Promise<PurchaseOrder> {
        const po = await this.findOne(id, user);
        this.validateApprover(po, user);

        const fromStatus = po.status;
        po.status = POStatus.NEEDS_REWORK;
        await this.poRepository.save(po);
        await this.saveHistory(
            po,
            POAction.REJECTED,
            user,
            fromStatus,
            po.status,
            dto.comment,
        );
        this.notificationsService.notifyOnReject(po, dto.comment).catch(() => null);
        return po;
    }

    async hardReject(id: string, dto: RejectPoDto, user: User): Promise<PurchaseOrder> {
        if (user.role !== UserRole.FINANCE) throw new ForbiddenException();
        const po = await this.findOne(id, user);
        if (po.status !== POStatus.PENDING_FINANCE) {
            throw new ForbiddenException('Hard reject is only allowed at the Finance stage');
        }
        if (po.createdBy.id === user.id) {
            throw new ForbiddenException('You cannot reject your own purchase order');
        }

        const fromStatus = po.status;
        po.status = POStatus.PERMANENTLY_REJECTED;
        await this.poRepository.save(po);
        await this.saveHistory(po, POAction.HARD_REJECTED, user, fromStatus, po.status, dto.comment);
        this.notificationsService.notifyOnReject(po, dto.comment).catch(() => null);
        return po;
    }

    async getMonthlySpendings(): Promise<{ requesterId: string; name: string; email: string; total: number }[]> {
        const now = new Date();
        const start = new Date(now.getFullYear(), now.getMonth(), 1);
        const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);

        const activeStatuses = [
            POStatus.PENDING_MANAGER,
            POStatus.PENDING_IT,
            POStatus.PENDING_FINANCE,
            POStatus.INVOICED,
        ];

        const rows = await this.poRepository
            .createQueryBuilder('po')
            .leftJoin('po.createdBy', 'user')
            .select('user.id', 'requesterId')
            .addSelect('user.name', 'name')
            .addSelect('user.email', 'email')
            .addSelect('SUM(po.amount)', 'total')
            .where('po.status IN (:...statuses)', { statuses: activeStatuses })
            .andWhere('po.createdAt >= :start', { start })
            .andWhere('po.createdAt < :end', { end })
            .groupBy('user.id')
            .addGroupBy('user.name')
            .addGroupBy('user.email')
            .getRawMany();

        return rows.map((r) => ({ ...r, total: parseFloat(r.total) || 0 }));
    }

    async invoice(id: string, user: User): Promise<PurchaseOrder> {
        const po = await this.findOne(id, user);
        if (po.status !== POStatus.PENDING_FINANCE) {
            throw new ForbiddenException('PO is not ready for invoicing');
        }
        if (user.role !== UserRole.FINANCE) throw new ForbiddenException();

        const fromStatus = po.status;
        po.status = POStatus.INVOICED;
        await this.poRepository.save(po);
        await this.saveHistory(po, POAction.INVOICED, user, fromStatus, po.status);
        await this.budgetsService.addUsedAmount(po.createdBy.id, Number(po.amount));
        this.notificationsService.notifyRequesterStatusChange(po).catch(() => null);
        return po;
    }

    async getMyApprovals(user: User): Promise<POHistory[]> {
        return this.historyRepository.find({
            where: {
                performedBy: { id: user.id },
                action: In([POAction.APPROVED, POAction.REJECTED, POAction.HARD_REJECTED]),
            },
            relations: { performedBy: true, purchaseOrder: { createdBy: true } },
            order: { timestamp: 'DESC' },
        });
    }

    async getHistory(id: string): Promise<POHistory[]> {
        return this.historyRepository.find({
            where: { purchaseOrder: { id } },
            relations: { performedBy: true },
            order: { timestamp: 'ASC' },
        });
    }

    private getNextStatusAfterManager(po: PurchaseOrder): POStatus {
        return po.category === POCategory.IT_EQUIPMENT
            ? POStatus.PENDING_IT
            : POStatus.PENDING_FINANCE;
    }

    private getNextStatus(po: PurchaseOrder): POStatus {
        switch (po.status) {
            case POStatus.PENDING_MANAGER:
                return this.getNextStatusAfterManager(po);
            case POStatus.PENDING_IT:
                return POStatus.PENDING_FINANCE;
            case POStatus.PENDING_FINANCE:
                return POStatus.INVOICED;
            default:
                throw new ForbiddenException('PO cannot be approved in current status');
        }
    }

    private validateApprover(po: PurchaseOrder, user: User): void {
        const allowed: Partial<Record<POStatus, UserRole>> = {
            [POStatus.PENDING_MANAGER]: UserRole.MANAGER,
            [POStatus.PENDING_IT]: UserRole.IT,
            [POStatus.PENDING_FINANCE]: UserRole.FINANCE,
        };
        if (allowed[po.status] !== user.role) {
            throw new ForbiddenException('You are not allowed to approve this PO');
        }
        const selfApprovalBlocked = [POStatus.PENDING_IT, POStatus.PENDING_FINANCE];
        if (selfApprovalBlocked.includes(po.status) && po.createdBy.id === user.id) {
            throw new ForbiddenException('You cannot approve your own purchase order');
        }
    }

    private async saveHistory(
        po: PurchaseOrder,
        action: POAction,
        user: User,
        fromStatus: POStatus,
        toStatus: POStatus,
        comment?: string,
    ): Promise<void> {
        const history = this.historyRepository.create({
            purchaseOrder: po,
            action,
            fromStatus,
            toStatus,
            comment,
            performedBy: user,
        });
        await this.historyRepository.save(history);
    }
}
