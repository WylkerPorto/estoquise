import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import {
  NotFoundException,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';

// Mocks
const prismaMock = {
  user: {
    findUnique: jest.fn(),
    create: jest.fn(),
  },
};

const jwtServiceMock = {
  sign: jest.fn(),
};

jest.mock('bcrypt', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

describe('AuthService Login', () => {
  let service: AuthService;
  let prisma: typeof prismaMock;
  let jwtService: typeof jwtServiceMock;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
        {
          provide: JwtService,
          useValue: jwtServiceMock,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prisma = module.get<PrismaService>(PrismaService);
    jwtService = module.get<JwtService>(JwtService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('Can return token if valid login', async () => {
    const dto = { login: 'admin', password: '1234' };

    prisma.user.findUnique.mockResolvedValue({
      id: 1,
      login: 'admin',
      password: 'hashed_password',
      name: 'Administrador',
      role: 'ADMIN',
    });

    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    jwtService.sign.mockReturnValue('fake-token');

    const result = await service.login(dto);

    expect(result).toEqual({
      access_token: 'fake-token',
      user: {
        name: 'Administrador',
        role: 'ADMIN',
      },
    });
  });

  it('User does not exist', async () => {
    const dto = { login: 'admin', password: '1234' };

    prisma.user.findUnique.mockResolvedValue(null);

    await expect(service.login(dto)).rejects.toThrow(NotFoundException);
    await expect(service.login(dto)).rejects.toThrow('User not found');
  });

  it('Password invalid', async () => {
    const dto = { login: 'admin', password: 'xxxx' };

    prisma.user.findUnique.mockResolvedValue({
      id: 1,
      login: 'admin',
      password: 'hashed_password',
      name: 'Administrador',
      role: 'ADMIN',
    });

    (bcrypt.compare as jest.Mock).mockResolvedValue(false);

    await expect(service.login(dto)).rejects.toThrow(UnauthorizedException);
    await expect(service.login(dto)).rejects.toThrow('Invalid password');
  });

  it('Empty login or password should throw validation error', async () => {
    const dto = { login: '', password: '' };

    // Como o validation pipe não roda no service,
    // simulamos comportamento esperado:
    prisma.user.findUnique.mockResolvedValue(null);

    await expect(service.login(dto)).rejects.toThrow(NotFoundException);
  });
});

describe('AuthService Register', () => {
  let service: AuthService;
  let prisma: typeof prismaMock;
  let jwtService: typeof jwtServiceMock;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
        {
          provide: JwtService,
          useValue: jwtServiceMock,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prisma = module.get<PrismaService>(PrismaService);
    jwtService = module.get<JwtService>(JwtService);

    jest.clearAllMocks();
  });

  it('Can return error if user already exists', async () => {
    const dto = {
      login: 'admin',
      password: 'hashed_password',
      name: 'Administrador',
      role: 'ADMIN',
    };

    prisma.user.findUnique.mockResolvedValue({
      id: 1,
      login: 'admin',
      password: 'hashed_password',
      name: 'Administrador',
      role: 'ADMIN',
    });

    await expect(service.register(dto)).rejects.toThrow(ConflictException);
  });

  it('should create user and return ok', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.user.create.mockResolvedValue({ id: 1 });

    const dto = {
      login: 'admin',
      password: 'hashed_password',
      name: 'Administrador',
      role: 'NEW',
    };

    await expect(service.register(dto)).resolves.toEqual({ ok: true });
    expect(prisma.user.create).toHaveBeenCalled();
  });

  it('should hash password before saving user', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.user.create.mockResolvedValue({ id: 1 });

    // mock do hash
    const hashed = 'hashed_pw_123';
    (bcrypt.hash as jest.Mock).mockResolvedValue(hashed);

    const dto = {
      login: 'admin',
      password: '1234',
      name: 'Administrador',
      role: 'NEW',
    };

    await service.register(dto);

    // 1) bcrypt.hash deve ser chamado com a senha original
    expect(bcrypt.hash).toHaveBeenCalledWith('1234', expect.any(Number));

    // 2) user.create deve receber a senha hasheada
    expect(prisma.user.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        password: hashed, // senha HASHEADA
      }),
    });

    // 3) Garantir que NÃO foi usada a senha original
    expect(prisma.user.create).not.toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          password: '1234',
        }),
      }),
    );
  });

  it('should save user with role NEW', async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    const hashed = 'hashed_pw_123';
    (bcrypt.hash as jest.Mock).mockResolvedValue(hashed);

    const dto = {
      login: 'admin',
      password: '1234',
      name: 'Administrador',
      role: 'SHOULD_BE_IGNORED',
    };

    await service.register(dto);

    expect(prisma.user.create).toHaveBeenCalledWith({
      data: {
        ...dto,
        password: hashed,
        role: 'NEW', // <- AQUI que testamos!
      },
    });
  });

  it('should hash the password using bcrypt with salt rounds = 10', async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    const hashed = 'hashed_pw_anything';
    (bcrypt.hash as jest.Mock).mockResolvedValue(hashed);

    prisma.user.create.mockResolvedValue({ id: 1 });

    const dto = {
      login: 'newuser',
      password: 'mypassword',
      name: 'User Teste',
      role: 'NEW',
    };

    const result = await service.register(dto);

    expect(bcrypt.hash).toHaveBeenCalledWith('mypassword', 10); // <— valida rounds

    expect(prisma.user.create).toHaveBeenCalledWith({
      data: {
        login: 'newuser',
        password: hashed,
        name: 'User Teste',
        role: 'NEW',
      },
    });

    expect(result).toEqual({ ok: true });
  });
});
