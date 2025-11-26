import { Test, TestingModule } from '@nestjs/testing';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { NotFoundException } from '@nestjs/common';

describe('UserController', () => {
  let controller: UserController;
  let service: UserService;

  const mockUserService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserController],
      providers: [UserService],
    })
      .overrideProvider(UserService)
      .useValue(mockUserService)
      .compile();

    controller = module.get<UserController>(UserController);
    service = module.get<UserService>(UserService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create and return the created user', async () => {
      const dto: CreateUserDto = {
        name: 'Admin User',
        login: 'admin',
        password: '123456',
        role: 'ADMIN' as any,
      };

      const created = { id: 1, ...dto };
      mockUserService.create.mockResolvedValue(created);

      const result = await controller.create(dto);
      expect(result).toEqual(created);
      expect(mockUserService.create).toHaveBeenCalledWith(dto);
    });
  });

  describe('findAll', () => {
    it('should return all users', async () => {
      const users = [
        { id: 1, name: 'User 1', login: 'u1', role: 'CAIXA' },
        { id: 2, name: 'User 2', login: 'u2', role: 'ESTOQUE' },
      ];

      mockUserService.findAll.mockResolvedValue(users);

      const result = await controller.findAll();
      expect(result).toBe(users);
      expect(mockUserService.findAll).toHaveBeenCalled();
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
    it('should return a user by ID', async () => {
      const user = { id: 1, name: 'User 1', login: 'u1', role: 'ADMIN' };

      mockUserService.findOne.mockResolvedValue(user);

      const reqMock = { user: { id: 1, role: 'ADMIN' } };
      const result = await controller.findOne('1', reqMock);
      expect(result).toEqual(user);
      expect(mockUserService.findOne).toHaveBeenCalledWith(1);
    });

    it('should throw NotFoundException if user does not exist', async () => {
      mockUserService.findOne.mockRejectedValue(new NotFoundException());

      const reqMock = { user: { id: 1, role: 'ADMIN' } };
      await expect(controller.findOne('99', reqMock)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should update and return the user', async () => {
      const dto: UpdateUserDto = { name: 'Novo Nome' };
      const updated = {
        id: 1,
        name: 'Novo Nome',
        login: 'admin',
        role: 'ADMIN',
      };

      mockUserService.update.mockResolvedValue(updated);

      const reqMock = { user: { id: 1, role: 'ADMIN' } };
      const result = await controller.update('1', dto, reqMock);
      expect(result).toEqual(updated);
      expect(mockUserService.update).toHaveBeenCalledWith(1, dto);
    });
  });

  describe('remove', () => {
    it('should delete the user and return result', async () => {
      mockUserService.remove.mockResolvedValue({ ok: true });

      const result = await controller.remove('1');
      expect(result).toEqual({ ok: true });
      expect(mockUserService.remove).toHaveBeenCalledWith(1);
    });
  });
});
