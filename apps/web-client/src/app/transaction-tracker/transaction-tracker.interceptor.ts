import {
  HttpEvent,
  HttpHandler,
  HttpInterceptor,
  HttpRequest,
  HttpResponse,
} from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { TransactionTrackerStore } from './transaction-tracker.store';

@Injectable()
export class TransactionTrackerInterceptor implements HttpInterceptor {
  constructor(
    private readonly _transactionTrackerStore: TransactionTrackerStore
  ) {}

  private isSolanaTransaction(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    httpRequest: HttpRequest<any>
  ) {
    return httpRequest.headers.get('solana-rpc-method') === 'sendTransaction';
  }

  intercept(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    httpRequest: HttpRequest<any>,
    next: HttpHandler
  ): Observable<HttpEvent<string>> {
    // Handle only solana transactions
    if (!this.isSolanaTransaction(httpRequest)) {
      return next.handle(httpRequest);
    }

    return next.handle(httpRequest).pipe(
      tap((event) => {
        if (event instanceof HttpResponse && event.body !== null) {
          this._transactionTrackerStore.reportProgress(
            httpRequest.body,
            event.body
          );
        }
      })
    );
  }
}
