import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface Response<T> {
  success: true;
  message: string;
  data: T;
}

@Injectable()
export class TransformInterceptor<T>
  implements NestInterceptor<T, Response<T>>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<Response<T>> {
    const request = context.switchToHttp().getRequest();
    
    return next.handle().pipe(
      map((res) => {
        // If the controller returns an object with a 'data' property, 
        // we use that as the data and use the 'message' if provided.
        const hasData = res && typeof res === 'object' && 'data' in res;
        const message = res?.message || 'Request successful';
        const data = hasData ? res.data : res;

        return {
          success: true,
          message,
          data,
        };
      }),
    );
  }
}
