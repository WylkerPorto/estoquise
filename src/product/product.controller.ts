import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Req,
  ForbiddenException,
  Query,
} from '@nestjs/common';
import { ProductService } from './product.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Role } from '../common/enums/role.enum';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

@ApiTags('Products')
@ApiBearerAuth()
@Controller('products')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  // ---------------------------
  // CREATE (ADMIN + ESTOQUE)
  // ---------------------------
  @Post()
  @Roles(Role.ADMIN, Role.ESTOQUE)
  create(@Body() createProductDto: CreateProductDto) {
    return this.productService.create(createProductDto);
  }

  // ---------------------------
  // FIND ALL (TODOS - NOVO)
  // ---------------------------
  @Get()
  @Roles(Role.ADMIN, Role.ESTOQUE, Role.CAIXA)
  findAll(@Query('page') page: number = 1, @Query('limit') limit: number = 10) {
    return this.productService.findAll(+page, +limit);
  }

  // ---------------------------
  // FIND ONE (TODOS - NOVO)
  // ---------------------------
  @Get(':id')
  @Roles(Role.ADMIN, Role.ESTOQUE, Role.CAIXA)
  findOne(@Param('id') id: string) {
    return this.productService.findOne(+id);
  }

  // ---------------------------
  // UPDATE (ADMIN + ESTOQUE)
  // ---------------------------
  @Patch(':id')
  @Roles(Role.ADMIN, Role.ESTOQUE)
  update(@Param('id') id: string, @Body() updateProductDto: UpdateProductDto) {
    return this.productService.update(+id, updateProductDto);
  }

  // ---------------------------
  // REMOVE (ADMIN + ESTOQUE)
  // ---------------------------
  @Delete(':id')
  @Roles(Role.ADMIN, Role.ESTOQUE)
  remove(@Param('id') id: string) {
    return this.productService.remove(+id);
  }
}
