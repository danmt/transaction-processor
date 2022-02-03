import { HTTP_INTERCEPTORS } from '@angular/common/http';
import { SolanaRpcApiAuthInterceptor } from './solana-rpc-api-auth.interceptor';
import { SolanaRpcApiInterceptor } from './solana-rpc-api.interceptor';

export const solanaRpcApiInterceptorProviders = [
  {
    provide: HTTP_INTERCEPTORS,
    useClass: SolanaRpcApiAuthInterceptor,
    multi: true,
  },
  {
    provide: HTTP_INTERCEPTORS,
    useClass: SolanaRpcApiInterceptor,
    multi: true,
  },
];
