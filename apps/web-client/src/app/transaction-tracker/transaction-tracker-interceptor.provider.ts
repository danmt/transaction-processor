import { HTTP_INTERCEPTORS } from '@angular/common/http';
import { TransactionTrackerInterceptor } from './transaction-tracker.interceptor';

export const transactionTrackerInterceptorProvider = [
  {
    provide: HTTP_INTERCEPTORS,
    useClass: TransactionTrackerInterceptor,
    multi: true,
  },
];
