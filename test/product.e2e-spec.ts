import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../src/prisma/prisma.service';
import { ProductModule } from 'src/product/product.module';
import { Role } from '../src/common/enums/role.enum';
import { JwtAuthGuard } from '../src/auth/jwt-auth.guard';
import { RolesGuard } from '../src/common/guards/roles.guard';

// cria um guard customizável para cada teste
const mockUserGuard = (user: any) => ({
  canActivate(ctx) {
    const req = ctx.switchToHttp().getRequest();
    // jwt payload costuma ter `sub` como id do usuário; preservamos também `id` para compatibilidade
    req.user = { ...(user || {}), sub: user?.id };
    return true;
  },
});

describe('ProductsController (e2e)', () => {
  let app: INestApplication;
  let prismaMock: any;

  beforeEach(async () => {
    prismaMock = {
      product: {
        findMany: jest.fn(),
        count: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      $transaction: jest.fn((queries) => {
        return Promise.all(queries);
      }),
    };
  });

  async function initWithUser(user) {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [ProductModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prismaMock)
      .overrideGuard(JwtAuthGuard)
      .useValue(mockUserGuard(user))
      // substitui RolesGuard por um mock simples que não depende de Reflector
      .overrideGuard(RolesGuard)
      .useValue({
        canActivate(ctx) {
          const req = ctx.switchToHttp().getRequest();
          const role = req.user?.role;
          const method = req.method;
          const url = req.originalUrl || req.url || '';

          return true;
        },
      })
      .compile();

    app = moduleFixture.createNestApplication();

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.init();
  }

  afterEach(async () => {
    await app.close();
  });

  //-----------------------------
  // CREATE
  //-----------------------------
  describe('POST /products', () => {});

  //-----------------------------
  // FIND ALL
  //-----------------------------
  describe('GET /products', () => {});

  //-----------------------------
  // FIND ONE
  //-----------------------------
  describe('GET /products/:id', () => {});

  //-----------------------------
  // UPDATE
  //-----------------------------
  describe('PATCH /products/:id', () => {});

  //-----------------------------
  // REMOVE
  //-----------------------------
  describe('DELETE /products/:id', () => {});
});
