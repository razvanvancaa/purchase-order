import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { POHistory, POAction } from 'src/po-history/po-history.entity';
import { UserRole, User } from 'src/users/user.entity';
import { PurchaseOrder, POCategory, POStatus } from './purchase-order.entity';
import { PurchaseOrdersService } from './purchase-orders.service';

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
    createQueryBuilder: jest.fn(),
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

  // ─── create ────────────────────────────────────────────────────────────────

  describe('create', () => {
    it('auto-rejects PO over €2000 with hard_rejected history', async () => {
      const user = makeUser(UserRole.REQUESTER);
      const po = makePO({ status: POStatus.PERMANENTLY_REJECTED });
      mockPoRepo.create.mockReturnValue(po);
      mockPoRepo.save.mockResolvedValue(po);

      const result = await service.create(
        { title: 'Expensive', amount: 2001, category: POCategory.OFFICE_SUPPLIES } as any,
        user,
      );

      expect(result.status).toBe(POStatus.PERMANENTLY_REJECTED);
      expect(mockHistoryRepo.save).toHaveBeenCalledTimes(2);
      const secondHistoryCreate = mockHistoryRepo.create.mock.calls[1][0];
      expect(secondHistoryCreate.action).toBe(POAction.HARD_REJECTED);
      expect(secondHistoryCreate.comment).toBe('too expensive, budget exceeded');
    });

    it('skips manager stage when creator is a Manager', async () => {
      const manager = makeUser(UserRole.MANAGER);
      mockPoRepo.create.mockImplementation((data) => ({ ...makePO(), ...data }));
      mockPoRepo.save.mockImplementation(async (p) => p);

      await service.create({ title: 'By manager', amount: 500, category: POCategory.SERVICES } as any, manager);

      const created = mockPoRepo.create.mock.calls[0][0];
      expect(created.status).toBe(POStatus.PENDING_FINANCE);
    });

    it('skips manager stage for amounts under €100', async () => {
      const user = makeUser(UserRole.REQUESTER);
      mockPoRepo.create.mockImplementation((data) => ({ ...makePO(), ...data }));
      mockPoRepo.save.mockImplementation(async (p) => p);

      await service.create({ title: 'Small', amount: 50, category: POCategory.SERVICES } as any, user);

      const created = mockPoRepo.create.mock.calls[0][0];
      expect(created.status).toBe(POStatus.PENDING_FINANCE);
    });

    it('routes IT_EQUIPMENT to PENDING_IT when manager creates it', async () => {
      const manager = makeUser(UserRole.MANAGER);
      mockPoRepo.create.mockImplementation((data) => ({ ...makePO(), ...data }));
      mockPoRepo.save.mockImplementation(async (p) => p);

      await service.create({ title: 'Laptop', amount: 800, category: POCategory.IT_EQUIPMENT } as any, manager);

      const created = mockPoRepo.create.mock.calls[0][0];
      expect(created.status).toBe(POStatus.PENDING_IT);
    });

    it('sets PENDING_MANAGER as initial status for regular requester', async () => {
      const user = makeUser(UserRole.REQUESTER);
      mockPoRepo.create.mockImplementation((data) => ({ ...makePO(), ...data }));
      mockPoRepo.save.mockImplementation(async (p) => p);

      await service.create({ title: 'Normal PO', amount: 500, category: POCategory.SERVICES } as any, user);

      const created = mockPoRepo.create.mock.calls[0][0];
      expect(created.status).toBe(POStatus.PENDING_MANAGER);
    });
  });

  // ─── findAll ───────────────────────────────────────────────────────────────

  describe('findAll', () => {
    it('manager sees only PENDING_MANAGER POs', async () => {
      const manager = makeUser(UserRole.MANAGER);
      mockPoRepo.find.mockResolvedValue([makePO({ status: POStatus.PENDING_MANAGER })]);

      await service.findAll(manager);

      expect(mockPoRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({ where: { status: POStatus.PENDING_MANAGER } }),
      );
    });

    it('IT sees only PENDING_IT POs', async () => {
      const it = makeUser(UserRole.IT);
      mockPoRepo.find.mockResolvedValue([]);

      await service.findAll(it);

      expect(mockPoRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({ where: { status: POStatus.PENDING_IT } }),
      );
    });

    it('requester sees only their own POs', async () => {
      const requester = makeUser(UserRole.REQUESTER, 'req-1');
      mockPoRepo.find.mockResolvedValue([]);

      await service.findAll(requester);

      expect(mockPoRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({ where: { createdBy: { id: 'req-1' } } }),
      );
    });

    it('finance where clause is an array (OR condition)', async () => {
      const finance = makeUser(UserRole.FINANCE, 'fin-1');
      mockPoRepo.find.mockResolvedValue([]);

      await service.findAll(finance);

      const call = mockPoRepo.find.mock.calls[0][0];
      expect(Array.isArray(call.where)).toBe(true);
      expect(call.where).toHaveLength(2);
      expect(call.where[1]).toEqual({ createdBy: { id: 'fin-1' } });
    });
  });

  // ─── approve ───────────────────────────────────────────────────────────────

  describe('approve', () => {
    it('manager approves PENDING_MANAGER → PENDING_FINANCE for non-IT category', async () => {
      const manager = makeUser(UserRole.MANAGER);
      const po = makePO({ status: POStatus.PENDING_MANAGER, category: POCategory.SERVICES });
      mockPoRepo.findOne.mockResolvedValue(po);
      mockPoRepo.save.mockImplementation(async (p) => p);

      const result = await service.approve('po-1', manager);

      expect(result.status).toBe(POStatus.PENDING_FINANCE);
    });

    it('manager approves PENDING_MANAGER → PENDING_IT for IT_EQUIPMENT', async () => {
      const manager = makeUser(UserRole.MANAGER);
      const po = makePO({ status: POStatus.PENDING_MANAGER, category: POCategory.IT_EQUIPMENT });
      mockPoRepo.findOne.mockResolvedValue(po);
      mockPoRepo.save.mockImplementation(async (p) => p);

      const result = await service.approve('po-1', manager);

      expect(result.status).toBe(POStatus.PENDING_IT);
    });

    it('IT approves PENDING_IT → PENDING_FINANCE', async () => {
      const itUser = makeUser(UserRole.IT, 'it-user');
      const po = makePO({ status: POStatus.PENDING_IT, createdBy: makeUser(UserRole.REQUESTER, 'req-1') });
      mockPoRepo.findOne.mockResolvedValue(po);
      mockPoRepo.save.mockImplementation(async (p) => p);

      const result = await service.approve('po-1', itUser);

      expect(result.status).toBe(POStatus.PENDING_FINANCE);
    });

    it('finance approves PENDING_FINANCE → INVOICED', async () => {
      const finance = makeUser(UserRole.FINANCE, 'fin-2');
      const po = makePO({ status: POStatus.PENDING_FINANCE, createdBy: makeUser(UserRole.REQUESTER, 'req-1') });
      mockPoRepo.findOne.mockResolvedValue(po);
      mockPoRepo.save.mockImplementation(async (p) => p);

      const result = await service.approve('po-1', finance);

      expect(result.status).toBe(POStatus.INVOICED);
    });

    it('throws ForbiddenException when role does not match stage', async () => {
      const it = makeUser(UserRole.IT);
      const po = makePO({ status: POStatus.PENDING_MANAGER });
      mockPoRepo.findOne.mockResolvedValue(po);

      await expect(service.approve('po-1', it)).rejects.toThrow(ForbiddenException);
    });

    it('blocks self-approval at PENDING_IT', async () => {
      const itUser = makeUser(UserRole.IT, 'user-1');
      const po = makePO({ status: POStatus.PENDING_IT, createdBy: makeUser(UserRole.REQUESTER, 'user-1') });
      mockPoRepo.findOne.mockResolvedValue(po);

      await expect(service.approve('po-1', itUser)).rejects.toThrow(ForbiddenException);
    });

    it('blocks self-approval at PENDING_FINANCE', async () => {
      const finance = makeUser(UserRole.FINANCE, 'user-1');
      const po = makePO({ status: POStatus.PENDING_FINANCE, createdBy: makeUser(UserRole.REQUESTER, 'user-1') });
      mockPoRepo.findOne.mockResolvedValue(po);

      await expect(service.approve('po-1', finance)).rejects.toThrow(ForbiddenException);
    });

    it('allows approval by a different Finance user', async () => {
      const finance = makeUser(UserRole.FINANCE, 'fin-2');
      const po = makePO({ status: POStatus.PENDING_FINANCE, createdBy: makeUser(UserRole.REQUESTER, 'req-1') });
      mockPoRepo.findOne.mockResolvedValue(po);
      mockPoRepo.save.mockImplementation(async (p) => p);

      const result = await service.approve('po-1', finance);

      expect(result.status).toBe(POStatus.INVOICED);
    });

    it('throws NotFoundException for non-existent PO', async () => {
      mockPoRepo.findOne.mockResolvedValue(null);

      await expect(service.approve('no-such-id', makeUser(UserRole.MANAGER))).rejects.toThrow(NotFoundException);
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

  // ─── hardReject ────────────────────────────────────────────────────────────

  describe('hardReject', () => {
    it('Finance permanently rejects a PO at Finance stage', async () => {
      const finance = makeUser(UserRole.FINANCE, 'fin-2');
      const po = makePO({ status: POStatus.PENDING_FINANCE, createdBy: makeUser(UserRole.REQUESTER, 'req-1') });
      mockPoRepo.findOne.mockResolvedValue(po);
      mockPoRepo.save.mockImplementation(async (p) => p);

      const result = await service.hardReject('po-1', { comment: 'Over budget' }, finance);

      expect(result.status).toBe(POStatus.PERMANENTLY_REJECTED);
    });

    it('throws when non-Finance role tries to hard-reject', async () => {
      const manager = makeUser(UserRole.MANAGER);

      await expect(service.hardReject('po-1', { comment: 'x' }, manager)).rejects.toThrow(ForbiddenException);
    });

    it('throws when Finance tries to hard-reject own PO', async () => {
      const finance = makeUser(UserRole.FINANCE, 'user-1');
      const po = makePO({ status: POStatus.PENDING_FINANCE, createdBy: makeUser(UserRole.REQUESTER, 'user-1') });
      mockPoRepo.findOne.mockResolvedValue(po);

      await expect(service.hardReject('po-1', { comment: 'x' }, finance)).rejects.toThrow(ForbiddenException);
    });
  });

  // ─── update ────────────────────────────────────────────────────────────────

  describe('update', () => {
    it('requester can edit PO when status is NEEDS_REWORK', async () => {
      const requester = makeUser(UserRole.REQUESTER, 'req-1');
      const po = makePO({ status: POStatus.NEEDS_REWORK, createdBy: requester });
      mockPoRepo.findOne.mockResolvedValue(po);
      mockPoRepo.save.mockImplementation(async (p) => p);

      const result = await service.update('po-1', { title: 'Updated' }, requester);

      expect(result.title).toBe('Updated');
    });

    it('throws when PO is not in NEEDS_REWORK status', async () => {
      const requester = makeUser(UserRole.REQUESTER, 'req-1');
      const po = makePO({ status: POStatus.PENDING_MANAGER, createdBy: requester });
      mockPoRepo.findOne.mockResolvedValue(po);

      await expect(service.update('po-1', { title: 'X' }, requester)).rejects.toThrow(ForbiddenException);
    });

    it('throws when requester tries to edit another user PO', async () => {
      const requester = makeUser(UserRole.REQUESTER, 'req-1');
      const other = makeUser(UserRole.REQUESTER, 'req-2');
      const po = makePO({ status: POStatus.NEEDS_REWORK, createdBy: other });
      mockPoRepo.findOne.mockResolvedValue(po);

      await expect(service.update('po-1', { title: 'X' }, requester)).rejects.toThrow(ForbiddenException);
    });

    it('resubmitted PO with amount < 100 skips manager approval', async () => {
      const requester = makeUser(UserRole.REQUESTER, 'req-1');
      const po = makePO({ status: POStatus.NEEDS_REWORK, createdBy: requester, category: POCategory.SERVICES });
      mockPoRepo.findOne.mockResolvedValue(po);
      mockPoRepo.save.mockImplementation(async (p) => p);

      const result = await service.update('po-1', { amount: 50 }, requester);

      expect(result.status).toBe(POStatus.PENDING_FINANCE);
    });
  });
});
