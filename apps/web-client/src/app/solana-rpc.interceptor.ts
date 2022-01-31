import {
  HttpEvent,
  HttpHandler,
  HttpHeaders,
  HttpInterceptor,
  HttpRequest,
} from '@angular/common/http';
import { Injectable } from '@angular/core';
import { WalletStore } from '@heavy-duty/wallet-adapter';
import { concatMap, Observable, throwError } from 'rxjs';
import { v4 as uuid } from 'uuid';

@Injectable()
export class SolanaRpcInterceptor implements HttpInterceptor {
  constructor(private _walletStore: WalletStore) {}

  intercept(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    httpRequest: HttpRequest<any>,
    next: HttpHandler
  ): Observable<HttpEvent<string>> {
    if (!httpRequest.headers.has('solana-rpc-method')) {
      return next.handle(httpRequest);
    }

    const rpcMethod = httpRequest.headers.get('solana-rpc-method');

    if (rpcMethod === 'sendTransaction') {
      const signer = this._walletStore.signTransaction(httpRequest.body);

      if (!signer) {
        return throwError(() => new Error('Wallet cannot sign'));
      }

      return signer.pipe(
        concatMap((transaction) =>
          next.handle(
            httpRequest.clone({
              body: JSON.stringify([
                {
                  jsonrpc: '2.0',
                  method: rpcMethod,
                  id: uuid(),
                  params: [
                    transaction.serialize().toString('base64'),
                    { encoding: 'base64' },
                  ],
                },
              ]),
              headers: new HttpHeaders({
                'content-type': 'application/json',
              }),
            })
          )
        )
      );
    } else {
      return next.handle(
        httpRequest.clone({
          body: JSON.stringify([
            {
              jsonrpc: '2.0',
              method: rpcMethod,
              id: uuid(),
              params:
                httpRequest.body === null
                  ? []
                  : Array.isArray(httpRequest.body)
                  ? httpRequest.body
                  : [httpRequest.body],
            },
          ]),
          headers: new HttpHeaders({ 'content-type': 'application/json' }),
        })
      );
    }
  }
}
