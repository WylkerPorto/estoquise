import { Test, TestingModule } from '@nestjs/testing';
import { ProductService } from './product.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { ConflictException, NotFoundException } from '@nestjs/common';

//Mocks
prismaMock = {
  product: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  $transaction: jest.fn((queries) => {
    return Promise.all(queries);
  }),
};

const jwtServiceMock = {
  sign: jest.fn(),
};

describe('ProductService', () => {
  let service: ProductService;
  let prisma: typeof prismaMock;
  let jwtService: typeof jwtServiceMock;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: JwtService, useValue: jwtServiceMock },
      ],
    }).compile();

    service = module.get<ProductService>(ProductService);
    prisma = module.get<PrismaService>(PrismaService);
    jwtService = module.get<JwtService>(JwtService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('Can return error if product already exists', async () => {
      const dto = { name: 'Existing Product', price: 100, quantity: 10 };

      prisma.product.findUnique.mockResolvedValueOnce({
        id: 1,
        name: 'Existing Product',
        price: 100,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await expect(service.create(dto)).rejects.toThrow(ConflictException);
    });

    it('Should create a new product', async () => {
      prisma.product.findUnique.mockResolvedValue(null);
      prisma.product.create.mockResolvedValue({ id: 1 });

      const dto = { name: 'New Product', price: 150, quantity: 5 };

      await expect(service.create(dto)).resolves.toEqual({ ok: true });
      expect(prisma.product.create).toHaveBeenCalled();
    });
  });

  describe('Update', () => {
    it('should update product with only new quantity', async () => {
      const productId = 1;
      const updateDto = { quantity: 20 };

      prisma.product.update.mockResolvedValue({
        id: productId,
        name: 'Updated Product',
        price: 200,
        quantity: 20,
      });

      const result = await service.update(productId, updateDto);

      expect(prisma.product.update).toHaveBeenCalledWith({
        where: { id: productId },
        data: { ...updateDto },
      });
      expect(result).toEqual({
        id: productId,
        name: 'Updated Product',
        price: 200,
        quantity: 20,
      });
    });

    it('should update product with only observation', async () => {
      const productId = 2;
      const updateDto = { obs: 'New observation' };

      prisma.product.update.mockResolvedValue({
        id: productId,
        name: 'Updated Product',
        price: 200,
        quantity: 10,
        obs: 'New observation',
      });

      const result = await service.update(productId, updateDto);

      expect(prisma.product.update).toHaveBeenCalledWith({
        where: { id: productId },
        data: { ...updateDto },
      });
      expect(result).toEqual({
        id: productId,
        name: 'Updated Product',
        price: 200,
        quantity: 10,
        obs: 'New observation',
      });
    });

    it('should update multiple fields', async () => {
      const productId = 3;
      const updateDto = { price: 250, quantity: 15 };

      prisma.product.update.mockResolvedValue({
        id: productId,
        name: 'Updated Product',
        price: 250,
        quantity: 15,
      });

      const result = await service.update(productId, updateDto);

      expect(prisma.product.update).toHaveBeenCalledWith({
        where: { id: productId },
        data: { ...updateDto },
      });
      expect(result).toEqual({
        id: productId,
        name: 'Updated Product',
        price: 250,
        quantity: 15,
      });
    });

    it('should update product with empty dto', async () => {
      const productId = 4;
      const updateDto = {};

      prisma.product.update.mockResolvedValue({
        id: productId,
        name: 'Updated Product',
        price: 200,
        quantity: 10,
      });

      const result = await service.update(productId, updateDto);

      expect(prisma.product.update).toHaveBeenCalledWith({
        where: { id: productId },
        data: { ...updateDto },
      });
      expect(result).toEqual({
        id: productId,
        name: 'Updated Product',
        price: 200,
        quantity: 10,
      });
    });

    it('should throw NotFoundException if product does not exist', async () => {
      const productId = 999;
      const updateDto = { price: 300 };

      prisma.product.update.mockRejectedValue(new Error('Not found'));

      await expect(service.update(productId, updateDto)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('FindAll', () => {
    it('should return list of products on findAll', async () => {
      const prods = [
        { id: 1, name: 'Product 1', price: 100, quantity: 10 },
        { id: 2, name: 'Product 2', price: 200, quantity: 20 },
        { id: 3, name: 'Product 3', price: 300, quantity: 30 },
      ];

      prisma.product.findMany.mockResolvedValue(prods);

      const result = await service.findAll();

      expect(prisma.product.findMany).toHaveBeenCalled();
      expect(result.items).toEqual(prods);
    });

    it('should return empty array when no products', async () => {
      prisma.product.findMany.mockResolvedValue([]);

      const result = await service.findAll();
      expect(prisma.product.findMany).toHaveBeenCalled();
      expect(result.items).toEqual([]);
    });

    it('should propagate unexpected errors from prisma', async () => {
      prisma.product.findMany.mockRejectedValue(new Error('DB failure'));

      await expect(service.findAll()).rejects.toThrow(Error);
    });

    it('should return paginated data', async () => {
      prismaMock.product.findMany.mockResolvedValue([
        { id: 1, name: 'Product 1', price: 100, quantity: 10 },
        { id: 2, name: 'Product 2', price: 200, quantity: 20 },
      ]);

      prismaMock.product.count.mockResolvedValue(5);

      const result = await service.findAll(1, 2);

      expect(result.items).toHaveLength(2);
      expect(result.total).toBe(5);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(2);
      expect(result.lastPage).toBe(3);
    });
  });

  describe('FindOne', () => {
    it('should return a product by id', async () => {
      const prod = { id: 1, name: 'Product 1', price: 100, quantity: 10 };

      prisma.product.findUnique.mockResolvedValue(prod);

      const result = await service.findOne(1);

      expect(prisma.product.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(result).toEqual(prod);
    });

    it('should throw NotFoundException if product does not exist', async () => {
      prisma.product.findUnique.mockResolvedValue(null);

      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
    });

    it('should propagate unexpected errors from prisma', async () => {
      prisma.product.findUnique.mockRejectedValue(new Error('DB failure'));

      await expect(service.findOne(1)).rejects.toThrow(Error);
    });
  });

  describe('Remove', () => {
    it('should remove a product by id', async () => {
      const prod = { id: 1, name: 'Product 1', price: 100, quantity: 10 };

      prisma.product.delete.mockResolvedValue(prod);

      const result = await service.remove(1);

      expect(prisma.product.delete).toHaveBeenCalledWith({ where: { id: 1 } });
      expect(result).toEqual(prod);
    });

    it('should throw NotFoundException if product does not exist', async () => {
      prisma.product.delete.mockRejectedValue(new Error('Not found'));

      await expect(service.remove(999)).rejects.toThrow(NotFoundException);
    });

    it('should propagate unexpected errors from prisma', async () => {
      prisma.product.delete.mockRejectedValue(new Error('DB failure'));

      await expect(service.remove(1)).rejects.toThrow(Error);
    });
  });
});
