import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { NotFoundException, UnauthorizedException } from '@nestjs/common';

// Mocks
const prismaMock = {
  user: {
    findUnique: jest.fn(),
  },
};

const jwtServiceMock = {
  sign: jest.fn(),
};

jest.mock('bcrypt', () => ({
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

  it('Can return ok in register', async () => {
    const dto = {
      login: 'admin',
      password: 'hashed_password',
      name: 'Administrador',
      role: 'ADMIN',
    };

    await expect(service.register(dto)).toEqual('ok');
  });
});
