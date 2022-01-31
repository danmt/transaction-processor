import { Injectable } from '@angular/core';
import {
  concatMap,
  filter,
  fromEvent,
  map,
  Observable,
  of,
  share,
  take,
  tap,
} from 'rxjs';
import { v4 as uuid } from 'uuid';
import { environment } from '../environments/environment';

@Injectable({ providedIn: 'root' })
export class SolanaRpcSocketService {
  private readonly _ws = new WebSocket(environment.rpcWebsocket);
  accountChange$ = fromEvent<MessageEvent>(this._ws, 'message').pipe(
    share({
      resetOnRefCountZero: false,
    }),
    map(({ data }) => JSON.parse(data)),
    filter((message) => message.method === 'accountNotification'),
    map((message) => ({
      pubkey: this.accountLookup.get(message.params.subscription),
      accountInfo: message.params.result.value,
    }))
  );
  accountLookup = new Map<string, string>();
  subscriptionLookup = new Map<string, string>();

  accountSubscribe(accountId: string) {
    const correlationId = uuid();

    return fromEvent(this._ws, 'open').pipe(
      concatMap(() => {
        this._ws.send(
          JSON.stringify([
            {
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
            },
          ])
        );

        return fromEvent<MessageEvent>(this._ws, 'message').pipe(
          filter(({ data }) => {
            const parsedData = JSON.parse(data);

            if (!Array.isArray(parsedData) || parsedData.length === 0) {
              return false;
            }

            return parsedData[0].id === correlationId;
          }),
          take(1),
          map(({ data }) => JSON.parse(data)[0].result),
          tap((subscriptionId) => {
            this.accountLookup.set(subscriptionId, accountId);
            this.subscriptionLookup.set(accountId, subscriptionId);
          })
        );
      })
    );
  }

  accountUnsubscribe(accountId: string) {
    const correlationId = uuid();

    const open$: Observable<unknown> =
      this._ws.OPEN === this._ws.readyState
        ? of(null)
        : fromEvent(this._ws, 'open');

    return open$.pipe(
      concatMap(() => {
        this._ws.send(
          JSON.stringify([
            {
              jsonrpc: '2.0',
              id: correlationId,
              method: 'accountUnsubscribe',
              params: [this.subscriptionLookup.get(accountId)],
            },
          ])
        );

        return fromEvent<MessageEvent>(this._ws, 'message').pipe(
          filter(({ data }) => {
            const parsedData = JSON.parse(data);

            if (!Array.isArray(parsedData) || parsedData.length === 0) {
              return false;
            }

            return parsedData[0].id === correlationId;
          }),
          take(1),
          map(({ data }) => JSON.parse(data)[0].result),
          tap((subscriptionId) => {
            this.accountLookup.delete(accountId);
            this.subscriptionLookup.delete(subscriptionId);
          })
        );
      })
    );
  }
}
