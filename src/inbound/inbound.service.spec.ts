import { Test, TestingModule } from '@nestjs/testing';
import { InboundService } from './inbound.service';
import { PrismaService } from '../prisma/prisma.service';
import { Movement } from '../common/enums/movement.enum';
import { NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

const prismaMock = {
  movement: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  $transaction: jest.fn(),
};

describe('InboundService', () => {
  let service: InboundService;
  let prisma: typeof prismaMock;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InboundService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get<InboundService>(InboundService);
    prisma = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create inbound and include items', async () => {
      const dto = { movementItems: [{ productId: 1, quantity: 2, price: 10 }] };
      prisma.movement.create.mockResolvedValue({ id: 1, ...dto });

      const result = await service.create(5, dto as any);

      expect(prisma.movement.create).toHaveBeenCalledWith({
        data: {
          userId: 5,
          type: Movement.ENTRY,
          movementItems: dto.movementItems,
        },
        include: { movementItems: true },
      });

      expect(result).toEqual({ id: 1, ...dto });
    });
  });

  describe('findAll', () => {
    it('should return paginated results', async () => {
      const users = [{ id: 1 }];
      prisma.$transaction.mockResolvedValue([users, 1]);

      const res = await service.findAll(1, 10);

      expect(prisma.$transaction).toHaveBeenCalled();
      expect(res.items).toEqual(users);
      expect(res.page).toBe(1);
    });

    it('should propagate errors from prisma', async () => {
      prisma.$transaction.mockRejectedValue(new Error('fail'));
      await expect(service.findAll(1, 10)).rejects.toThrow(Error);
    });
  });

  describe('findOne', () => {
    it('should return inbound when found', async () => {
      prisma.movement.findUnique.mockResolvedValue({ id: 2 });
      const res = await service.findOne(2);
      expect(prisma.movement.findUnique).toHaveBeenCalledWith({
        where: { id: 2, type: Movement.ENTRY },
        include: { movementItems: true },
      });
      expect(res).toEqual({ id: 2 });
    });

    it('should throw NotFoundException when not found', async () => {
      prisma.movement.findUnique.mockResolvedValue(null);
      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update movement items when provided', async () => {
      const id = 3;
      const dto = { movementItems: [{ productId: 5, quantity: 2, price: 1 }] };

      prisma.movement.update.mockResolvedValue({
        id,
        movementItems: dto.movementItems,
      });

      const res = await service.update(id, dto as any);

      expect(prisma.movement.update).toHaveBeenCalledWith({
        where: { id },
        data: {
          movementItems: {
            deleteMany: {},
            create: dto.movementItems.map((mi) => ({
              productId: mi.productId,
              quantity: mi.quantity,
              price: mi.price,
            })),
          },
        },
        include: { movementItems: true },
      });

      expect(res).toEqual({ id, movementItems: dto.movementItems });
    });

    it('should throw NotFoundException when prisma returns P2025', async () => {
      prisma.movement.update.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('not found', {
          code: 'P2025',
          clientVersion: '4.0.0',
        }),
      );

      await expect(service.update(999, { movementItems: [] })).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('remove', () => {
    it('should delete movement and return deleted', async () => {
      prisma.movement.delete.mockResolvedValue({ id: 4 });
      const res = await service.remove(4);
      expect(prisma.movement.delete).toHaveBeenCalledWith({ where: { id: 4 } });
      expect(res).toEqual({ id: 4 });
    });

    it('should throw NotFoundException when delete returns P2025', async () => {
      prisma.movement.delete.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('not found', {
          code: 'P2025',
          clientVersion: '4.0.0',
        }),
      );

      await expect(service.remove(999)).rejects.toThrow(NotFoundException);
    });
  });
});
