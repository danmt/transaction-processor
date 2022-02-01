import { Injectable } from '@angular/core';
import { AccountInfo } from '@solana/web3.js';
import { BehaviorSubject, filter, map, Observable, Subject } from 'rxjs';
import { webSocket } from 'rxjs/webSocket';
import { v4 as uuid } from 'uuid';
import { environment } from '../environments/environment';

interface RpcResultNotification {
  jsonrpc: string;
  id: string;
  result: number;
}

interface Context {
  slot: number;
}

interface RpcResponseAndContext<T> {
  context: Context;
  value: T;
}

interface RpcAccountParamsNotification {
  result: RpcResponseAndContext<AccountInfo<Buffer>>;
  subscription: number;
}

interface RpcNotification<T> {
  jsonrpc: string;
  method: string;
  params: T;
}

type RpcMessage =
  | RpcResultNotification
  | RpcNotification<null>
  | RpcNotification<RpcAccountParamsNotification>;

const PING_DELAY_MS = 30_000;

@Injectable({ providedIn: 'root' })
export class SolanaRpcSocketService {
  private readonly _connected = new BehaviorSubject(false);
  readonly connected$ = this._connected.asObservable();
  messageSubject = new Subject();
  private readonly _subject = webSocket<RpcMessage>({
    url: environment.rpcWebsocket,
    openObserver: {
      next: () => {
        setInterval(
          () =>
            this._subject.next({
              jsonrpc: '2.0',
              method: 'ping',
              params: null,
            }),
          PING_DELAY_MS
        );

        this._connected.next(true);
      },
    },
    closeObserver: {
      next: () => this._connected.next(false),
    },
  });

  onAccountChange(accountId: string): Observable<AccountInfo<Buffer>> {
    const correlationId = uuid();
    let subscriptionId: number;

    return this._subject
      .multiplex(
        () => ({
          jsonrpc: '2.0',
          id: correlationId,
          method: 'accountSubscribe',
          params: [
            accountId,
            {
              encoding: 'base64',
              commitment: 'finalized',
            },
          ],
        }),
        () => ({
          jsonrpc: '2.0',
          id: uuid(),
          method: 'accountUnsubscribe',
          params: [subscriptionId],
        }),
        (message: RpcMessage) => {
          if ('id' in message && message.id === correlationId) {
            subscriptionId = message.result;
          }

          return (
            'method' in message &&
            message.method === 'accountNotification' &&
            message.params !== null &&
            message.params.subscription === subscriptionId
          );
        }
      )
      .pipe(
        filter(
          (message): message is RpcNotification<RpcAccountParamsNotification> =>
            'method' in message
        ),
        map((message) => message.params.result.value)
      );
  }
}
