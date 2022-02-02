import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import {
  AccountInfo,
  PublicKey,
  SignatureStatus,
  Transaction,
} from '@solana/web3.js';
import { concatMap, map, Observable } from 'rxjs';
import { environment } from '../environments/environment';

@Injectable({ providedIn: 'root' })
export class SolanaRpcApiService {
  constructor(private readonly _httpClient: HttpClient) {}

  private _rpcRequest<T>(method: string, params: unknown) {
    return this._httpClient
      .post<{ result: T }[]>(environment.rpcEndpoint, params, {
        headers: {
          'solana-rpc-method': method,
        },
      })
      .pipe(map(([res]) => res.result));
  }

  createAndSendTransaction(
    feePayer: PublicKey,
    beforeSendFunction: (transaction: Transaction) => Transaction
  ) {
    return this.getRecentBlockhash().pipe(
      concatMap(({ blockhash }) =>
        this.sendTransaction(
          beforeSendFunction(
            new Transaction({
              feePayer,
              recentBlockhash: blockhash,
            })
          )
        )
      )
    );
  }

  getAccountInfo(pubkey: string) {
    return this._rpcRequest<{
      value: AccountInfo<string>;
      context: { slot: number };
    }>('getAccountInfo', pubkey).pipe(map(({ value }) => value));
  }

  getBalance(pubkey: string) {
    return this._rpcRequest<{ value: number }>('getBalance', pubkey).pipe(
      map(({ value }) => value)
    );
  }

  getRecentBlockhash(): Observable<{ blockhash: string }> {
    return this._rpcRequest<{ value: { blockhash: string } }>(
      'getRecentBlockhash',
      null
    ).pipe(map(({ value }) => value));
  }

  getSignatureStatus(signature: string): Observable<SignatureStatus> {
    return this._rpcRequest<{ value: SignatureStatus[] }>(
      'getSignatureStatuses',
      [[signature], { searchTransactionHistory: true }]
    ).pipe(map(({ value: [status] }) => status));
  }

  sendTransaction(transaction: Transaction) {
    return this._rpcRequest<string>('sendTransaction', transaction);
  }
}
