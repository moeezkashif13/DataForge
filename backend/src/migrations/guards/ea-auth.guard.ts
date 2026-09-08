import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  createParamDecorator,
  applyDecorators,
  UseGuards,
  SetMetadata,
  Optional,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

const IS_PUBLIC_KEY = 'isPublic';
const IS_EA_AUTH_KEY = 'isEAAuth';

interface AgentJwtPayload {
  agent_id: string;
  organization_id: string;
  type: string;
}

@Injectable()
export class EAAuthGuard implements CanActivate {
  constructor(private readonly jwtService?: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = this.extractToken(request);

    if (!token) {
      throw new UnauthorizedException('Authorization token is required');
    }

    const secret = process.env.DEFAULT_JWT_SECRET;
    try {
      let payload = this?.jwtService?.verify(token, { secret });

      if (!payload || !payload.agent_id) {
        throw new UnauthorizedException(
          'Invalid authorization token: missing agent identity',
        );
      }

      // request.agent = payload;
      // request.agentId = payload.agent_id;
      // request.organizationId = payload.organization_id;

      return true;
    } catch (error: any) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      if (error?.name === 'TokenExpiredError') {
        throw new UnauthorizedException('Authorization token has expired');
      }
      if (error?.name === 'JsonWebTokenError') {
        throw new UnauthorizedException('Invalid authorization token');
      }
      throw new UnauthorizedException(
        error.message || 'Authorization token verification failed',
      );
    }
  }

  private extractToken(request: any): string | null {
    const authHeader = request.headers?.authorization;

    if (authHeader && typeof authHeader === 'string') {
      const [type, token] = authHeader.split(' ');
      if (type?.toLowerCase() === 'bearer' && token) {
        return token.trim();
      }
    }

    return null;
  }
}

export const EAAuth = () =>
  applyDecorators(
    SetMetadata(IS_PUBLIC_KEY, true),
    SetMetadata(IS_EA_AUTH_KEY, true),
    UseGuards(EAAuthGuard),
  );
