import { Test, TestingModule } from '@nestjs/testing';
import { ProductController } from './product.controller';
import { ProductService } from './product.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { NotFoundException } from '@nestjs/common';

describe('ProductController', () => {
  let controller: ProductController;
  let service: ProductService;

  const mockProductService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProductController],
      providers: [ProductService],
    })
      .overrideProvider(ProductService)
      .useValue(mockProductService)
      .compile();

    controller = module.get<ProductController>(ProductController);
    service = module.get<ProductService>(ProductService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create and return the cheated user', async () => {
      const dto: CreateProductDto = {
        name: 'Product 1',
        description: 'Description 1',
        price: 100,
        stock: 50,
      };

      const created = { id: 1, ...dto };
      mockProductService.create.mockResolvedValue(created);

      const result = await controller.create(dto);
      expect(result).toEqual(created);
      expect(mockProductService.create).toHaveBeenCalledWith(dto);
    });
  });

  describe('findAll', () => {
    it('should return all products', async () => {
      const products = [
        {
          id: 1,
          name: 'Product 1',
          description: 'Description 1',
          price: 100,
          stock: 50,
        },
        {
          id: 2,
          name: 'Product 2',
          description: 'Description 2',
          price: 200,
          stock: 30,
        },
      ];
      mockProductService.findAll.mockResolvedValue(products);

      const result = await controller.findAll(1, 10);
      expect(result).toEqual(products);
      expect(mockProductService.findAll).toHaveBeenCalledWith(1, 10);
    });

    it('should call service.findAll with page and limit', async () => {
      const mock = jest.spyOn(service, 'findAll').mockResolvedValue({
        items: [],
        total: 0,
        page: 1,
        limit: 10,
        lastPage: 1,
      });

      const res = await controller.findAll(1, 10);
      expect(mock).toHaveBeenCalledWith(1, 10);
      expect(res.items).toBeDefined();
    });
  });

  describe('findOne', () => {
    it('should return a product by ID', async () => {
      const product = {
        id: 1,
        name: 'Product 1',
        description: 'Description 1',
        price: 100,
        stock: 50,
      };

      mockProductService.findOne.mockResolvedValue(product);

      const result = await controller.findOne('1');
      expect(result).toEqual(product);
      expect(mockProductService.findOne).toHaveBeenCalledWith(1);
    });

    it('should throw NotFoundException if product not exists', async () => {
      mockProductService.findOne.mockRejectedValue(new NotFoundException());

      await expect(controller.findOne('99')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update and return the product', async () => {
      const dto: UpdateProductDto = { name: 'Updated Product' };
      const updated = {
        id: 1,
        name: 'Updated Product',
        description: 'Description 1',
        price: 100,
        stock: 50,
      };

      mockProductService.update.mockResolvedValue(updated);

      const result = await controller.update('1', dto);
      expect(result).toEqual(updated);
      expect(mockProductService.update).toHaveBeenCalledWith(1, dto);
    });
  });

  describe('remove', () => {
    it('should remove the product and return confirmation', async () => {
      mockProductService.remove.mockResolvedValue({ ok: true });

      const result = await controller.remove('1');
      expect(result).toEqual({ ok: true });
      expect(mockProductService.remove).toHaveBeenCalledWith(1);
    });
  });
});
