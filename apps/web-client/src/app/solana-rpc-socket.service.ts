import { Injectable } from '@angular/core';
import { AccountInfo, Commitment } from '@solana/web3.js';
import {
  BehaviorSubject,
  filter,
  first,
  map,
  Observable,
  Subject,
  switchMap,
} from 'rxjs';
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

interface RpcSignatureParamsNotification {
  result: RpcResponseAndContext<{ err: unknown }>;
  subscription: number;
}

type RpcMessage =
  | RpcResultNotification
  | RpcNotification<null>
  | RpcNotification<RpcSignatureParamsNotification>
  | RpcNotification<RpcAccountParamsNotification>;

const PING_DELAY_MS = 30_000;

@Injectable({ providedIn: 'root' })
export class SolanaRpcSocketService {
  private readonly _connected = new BehaviorSubject(false);
  readonly connected$ = this._connected.asObservable();
  messageSubject = new Subject();
  private readonly _subject = new BehaviorSubject(this._createWebSocket());

  private _createWebSocket() {
    let interval: NodeJS.Timer;

    const webSocketSubject = webSocket<RpcMessage>({
      url: environment.rpcWebsocket,
      openObserver: {
        next: () => {
          interval = setInterval(
            () =>
              webSocketSubject.next({
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
        next: (event) => {
          clearInterval(interval);
          this._connected.next(false);
          if (!event.wasClean) {
            this.connect();
          }
        },
      },
    });

    return webSocketSubject;
  }

  connect() {
    this._subject.next(this._createWebSocket());
  }

  disconnect() {
    this._subject
      .asObservable()
      .pipe(first())
      .subscribe((subject) => subject.complete());
  }

  onAccountChange(
    accountId: string,
    commitment: Commitment = 'confirmed'
  ): Observable<AccountInfo<Buffer>> {
    const correlationId = uuid();
    let subscriptionId: number;

    if (!this._subject) {
      throw new Error('WebSocketSubject is null');
    }

    return this._subject.asObservable().pipe(
      switchMap((subject) =>
        subject
          .multiplex(
            () => ({
              jsonrpc: '2.0',
              id: correlationId,
              method: 'accountSubscribe',
              params: [
                accountId,
                {
                  encoding: 'base64',
                  commitment,
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
              (
                message
              ): message is RpcNotification<RpcAccountParamsNotification> =>
                'method' in message
            ),
            map((message) => message.params.result.value)
          )
      )
    );
  }

  onSignatureChange(
    signature: string,
    commitment: Commitment = 'confirmed'
  ): Observable<{ err: unknown }> {
    const correlationId = uuid();
    let subscriptionId: number;

    if (!this._subject) {
      throw new Error('WebSocketSubject is null');
    }

    return this._subject.asObservable().pipe(
      switchMap((subject) =>
        subject
          .multiplex(
            () => ({
              jsonrpc: '2.0',
              id: correlationId,
              method: 'signatureSubscribe',
              params: [
                signature,
                {
                  commitment,
                },
              ],
            }),
            () => ({
              jsonrpc: '2.0',
              id: uuid(),
              method: 'signatureUnsubscribe',
              params: [subscriptionId],
            }),
            (message: RpcMessage) => {
              if ('id' in message && message.id === correlationId) {
                subscriptionId = message.result;
              }

              return (
                'method' in message &&
                message.method === 'signatureNotification' &&
                message.params !== null &&
                message.params.subscription === subscriptionId
              );
            }
          )
          .pipe(
            filter(
              (
                message
              ): message is RpcNotification<RpcSignatureParamsNotification> =>
                'method' in message
            ),
            map((message) => message.params.result.value)
          )
      )
    );
  }
}
