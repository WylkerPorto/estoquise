import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { ALLOW_SELF_KEY } from '../decorators/allow-self.decorator';
import { Role } from '../enums/role.enum';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles =
      this.reflector.get<Role[] | undefined>(ROLES_KEY, context.getHandler()) ??
      this.reflector.get<Role[] | undefined>(ROLES_KEY, context.getClass());

    // se não há metadata de roles, liberar (ou você pode mudar para negar por padrão)
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const allowSelf = this.reflector.get<boolean>(
      ALLOW_SELF_KEY,
      context.getHandler(),
    );

    const req = context.switchToHttp().getRequest();
    const user = req.user;

    if (!user) {
      // sem usuário (não autenticado) → negar
      throw new ForbiddenException('Sem permissões');
    }

    // se allowSelf está ativado: permitir quando recurso for do próprio usuário
    if (allowSelf) {
      // tenta extrair id do route param (comumente 'id'); adapte se usar 'userId' etc.
      const paramId = Number(req.params.id);
      if (!isNaN(paramId) && user.id === paramId) {
        return true; // o próprio usuário acessando seu recurso
      }
    }

    // caso contrário, verifica role
    if (requiredRoles.includes(user.role)) {
      return true;
    }

    // se chegou aqui: negar
    throw new ForbiddenException('Acesso negado');
  }
}
