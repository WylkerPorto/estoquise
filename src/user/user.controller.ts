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
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Role } from '../common/enums/role.enum';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UserController {
  constructor(private readonly userService: UserService) {}

  // ---------------------------
  // CREATE (ADMIN APENAS)
  // ---------------------------
  @Post()
  @Roles(Role.ADMIN)
  create(@Body() createUserDto: CreateUserDto) {
    return this.userService.create(createUserDto);
  }

  // ---------------------------
  // FIND ALL (ADMIN APENAS)
  // ---------------------------
  @Get()
  @Roles(Role.ADMIN)
  findAll(@Query('page') page: number = 1, @Query('limit') limit: number = 10) {
    return this.userService.findAll(+page, +limit);
  }

  // ---------------------------
  // FIND ONE (ADMIN ou PRÓPRIO USUÁRIO)
  // ---------------------------
  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: any) {
    const loggedUser = req.user;
    const targetId = Number(id);

    if (loggedUser.role !== Role.ADMIN && loggedUser.sub !== targetId) {
      throw new ForbiddenException(
        'Você não tem permissão para ver este usuário.',
      );
    }

    return this.userService.findOne(+id);
  }

  // ---------------------------
  // UPDATE
  // ADMIN → pode atualizar qualquer usuário
  // USER → só pode atualizar o próprio perfil
  // ---------------------------
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
    @Req() req: any,
  ) {
    const loggedUser = req.user;

    const targetId = Number(id);

    // Se não for admin, só pode editar o próprio perfil
    if (loggedUser.role !== Role.ADMIN && loggedUser.sub !== targetId) {
      throw new ForbiddenException(
        'Você não tem permissão para atualizar outro usuário.',
      );
    }

    return this.userService.update(targetId, updateUserDto);
  }

  // ---------------------------
  // DELETE (ADMIN APENAS)
  // ---------------------------
  @Delete(':id')
  @Roles(Role.ADMIN)
  remove(@Param('id') id: string) {
    return this.userService.remove(+id);
  }
}
