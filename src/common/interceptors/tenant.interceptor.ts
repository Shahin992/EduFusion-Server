import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  UnauthorizedException,
} from '@nestjs/common';
import { Observable } from 'rxjs';

@Injectable()
export class TenantInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // Super Admins don't need instituteId isolation for all operations,
    // but Institute Admins, Teachers, and Students MUST have one.
    if (user && user.role !== 'super_admin') {
      if (!user.instituteId) {
        throw new UnauthorizedException('No institute context found for this user.');
      }
      // Attach instituteId to the request for easy access in services
      request.instituteId = user.instituteId;
    }

    return next.handle();
  }
}
