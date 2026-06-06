import { ForbiddenException, NotFoundException } from "@nestjs/common";
import { TestingModule, Test } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { describe, beforeEach, it } from "node:test";
import { POHistory, POAction } from "src/po-history/po-history.entity";
import { UserRole, User } from "src/users/user.entity";
import { PurchaseOrder, POCategory, POStatus } from "./purchase-order.entity";
import { PurchaseOrdersService } from "./purchase-orders.service";


const makeUser = (role: UserRole, id = 'user-1'): User =>
  ({ id, role, email: `${role}@test.com`, name: role, password: '', createdAt: new Date() }) as User;

const makePO = (overrides: Partial<PurchaseOrder> = {}): PurchaseOrder =>
  ({
    id: 'po-1',
    title: 'Test PO',
    amount: 200,
    category: POCategory.SERVICES,
    status: POStatus.PENDING_MANAGER,
    createdBy: makeUser(UserRole.REQUESTER),
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }) as PurchaseOrder;

describe('PurchaseOrdersService', () => {
  let service: PurchaseOrdersService;

  const mockPoRepo = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
  };

  const mockHistoryRepo = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockHistoryRepo.create.mockReturnValue({});
    mockHistoryRepo.save.mockResolvedValue({});

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PurchaseOrdersService,
        { provide: getRepositoryToken(PurchaseOrder), useValue: mockPoRepo },
        { provide: getRepositoryToken(POHistory), useValue: mockHistoryRepo },
      ],
    }).compile();

    service = module.get<PurchaseOrdersService>(PurchaseOrdersService);
  });

  // ─── findAll ───────────────────────────────────────────────────────────────

  describe('findAll', () => {
    it('manager sees only PENDING_MANAGER POs', async () => {
      const manager = makeUser(UserRole.MANAGER);
      const pos = [makePO({ status: POStatus.PENDING_MANAGER })];
      mockPoRepo.find.mockResolvedValue(pos);

      const result = await service.findAll(manager);

      expect(mockPoRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({ where: { status: POStatus.PENDING_MANAGER } }),
      );
      expect(result).toHaveLength(1);
      expect(result[0].status).toBe(POStatus.PENDING_MANAGER);
    });

    it('finance sees only PENDING_FINANCE POs', async () => {
      const finance = makeUser(UserRole.FINANCE);
      const pos = [makePO({ status: POStatus.PENDING_FINANCE })];
      mockPoRepo.find.mockResolvedValue(pos);

      const result = await service.findAll(finance);

      expect(mockPoRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({ where: { status: POStatus.PENDING_FINANCE } }),
      );
      expect(result).toHaveLength(1);
      expect(result[0].status).toBe(POStatus.PENDING_FINANCE);
    });

    it('IT sees only PENDING_IT POs', async () => {
      const it = makeUser(UserRole.IT);
      const pos = [makePO({ status: POStatus.PENDING_IT })];
      mockPoRepo.find.mockResolvedValue(pos);

      const result = await service.findAll(it);

      expect(mockPoRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({ where: { status: POStatus.PENDING_IT } }),
      );
      expect(result).toHaveLength(1);
      expect(result[0].status).toBe(POStatus.PENDING_IT);
    });

    it('requester sees only their own POs', async () => {
      const requester = makeUser(UserRole.REQUESTER, 'req-1');
      mockPoRepo.find.mockResolvedValue([makePO({ createdBy: requester })]);

      await service.findAll(requester);

      expect(mockPoRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({ where: { createdBy: { id: 'req-1' } } }),
      );
    });
  });

  // ─── update ────────────────────────────────────────────────────────────────

  describe('update', () => {
    it('requester can edit PO when status is NEEDS_REWORK', async () => {
      const requester = makeUser(UserRole.REQUESTER, 'req-1');
      const po = makePO({ status: POStatus.NEEDS_REWORK, createdBy: requester });

      mockPoRepo.findOne.mockResolvedValue(po);
      mockPoRepo.save.mockResolvedValue({ ...po, title: 'Updated' });

      const result = await service.update('po-1', { title: 'Updated' }, requester);

      expect(result.title).toBe('Updated');
    });

    it('requester cannot edit PO when status is PENDING_MANAGER', async () => {
      const requester = makeUser(UserRole.REQUESTER, 'req-1');
      const po = makePO({ status: POStatus.PENDING_MANAGER, createdBy: requester });

      mockPoRepo.findOne.mockResolvedValue(po);

      await expect(service.update('po-1', { title: 'X' }, requester)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('requester cannot edit another users PO even if NEEDS_REWORK', async () => {
      const requester = makeUser(UserRole.REQUESTER, 'req-1');
      const otherUser = makeUser(UserRole.REQUESTER, 'req-2');
      const po = makePO({ status: POStatus.NEEDS_REWORK, createdBy: otherUser });

      mockPoRepo.findOne.mockResolvedValue(po);

      await expect(service.update('po-1', { title: 'X' }, requester)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('resubmitted PO with amount < 100 skips manager approval', async () => {
      const requester = makeUser(UserRole.REQUESTER, 'req-1');
      const po = makePO({
        status: POStatus.NEEDS_REWORK,
        createdBy: requester,
        category: POCategory.SERVICES,
      });

      mockPoRepo.findOne.mockResolvedValue(po);
      mockPoRepo.save.mockImplementation(async (p) => p);

      const result = await service.update('po-1', { amount: 50 }, requester);

      expect(result.status).toBe(POStatus.PENDING_FINANCE);
    });

    it('resubmitted IT Equipment PO with amount < 100 goes to PENDING_IT', async () => {
      const requester = makeUser(UserRole.REQUESTER, 'req-1');
      const po = makePO({
        status: POStatus.NEEDS_REWORK,
        createdBy: requester,
        category: POCategory.IT_EQUIPMENT,
      });

      mockPoRepo.findOne.mockResolvedValue(po);
      mockPoRepo.save.mockImplementation(async (p) => p);

      const result = await service.update('po-1', { amount: 50 }, requester);

      expect(result.status).toBe(POStatus.PENDING_IT);
    });
  });

  // ─── approve ───────────────────────────────────────────────────────────────

  describe('approve', () => {
    it('manager can approve PENDING_MANAGER PO', async () => {
      const manager = makeUser(UserRole.MANAGER);
      const po = makePO({ status: POStatus.PENDING_MANAGER, category: POCategory.SERVICES });

      mockPoRepo.findOne.mockResolvedValue(po);
      mockPoRepo.save.mockImplementation(async (p) => p);

      const result = await service.approve('po-1', manager);

      expect(result.status).toBe(POStatus.PENDING_FINANCE);
    });

    it('finance cannot approve PENDING_MANAGER PO', async () => {
      const finance = makeUser(UserRole.FINANCE);
      const po = makePO({ status: POStatus.PENDING_MANAGER });

      mockPoRepo.findOne.mockResolvedValue(po);

      await expect(service.approve('po-1', finance)).rejects.toThrow(ForbiddenException);
    });

    it('throws NotFoundException for non-existent PO', async () => {
      const manager = makeUser(UserRole.MANAGER);
      mockPoRepo.findOne.mockResolvedValue(null);

      await expect(service.approve('no-such-id', manager)).rejects.toThrow(NotFoundException);
    });
  });

  // ─── reject ────────────────────────────────────────────────────────────────

  describe('reject', () => {
    it('sets status to NEEDS_REWORK and saves comment', async () => {
      const manager = makeUser(UserRole.MANAGER);
      const po = makePO({ status: POStatus.PENDING_MANAGER });

      mockPoRepo.findOne.mockResolvedValue(po);
      mockPoRepo.save.mockImplementation(async (p) => p);

      const result = await service.reject('po-1', { comment: 'Too expensive' }, manager);

      expect(result.status).toBe(POStatus.NEEDS_REWORK);
      expect(mockHistoryRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          action: POAction.REJECTED,
          comment: 'Too expensive',
          toStatus: POStatus.NEEDS_REWORK,
        }),
      );
    });
  });
});
