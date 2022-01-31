import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { PublicKey, SystemProgram, Transaction } from '@solana/web3.js';
import { concatMap, map, Observable } from 'rxjs';
import { environment } from '../environments/environment';

@Injectable({ providedIn: 'root' })
export class SystemProgramApiService {
  constructor(private httpClient: HttpClient) {}

  nativeTransfer(fromPubkey: PublicKey, toPubkey: PublicKey, lamports: number) {
    return this.getRecentBlockhash().pipe(
      concatMap(({ blockhash }) =>
        this.httpClient.post(
          environment.rpcEndpoint,
          new Transaction({
            feePayer: fromPubkey,
            recentBlockhash: blockhash,
          }).add(
            SystemProgram.transfer({
              fromPubkey,
              toPubkey,
              lamports,
            })
          ),
          {
            headers: {
              'solana-network': environment.network,
              'rpc-method': 'sendTransaction',
            },
          }
        )
      )
    );
  }

  getBalance(fromPubkey: PublicKey) {
    return this.httpClient
      .post<{ result: { value: number } }[]>(
        environment.rpcEndpoint,
        fromPubkey,
        {
          headers: {
            'solana-network': environment.network,
            'rpc-method': 'getBalance',
          },
        }
      )
      .pipe(map(([res]) => res.result.value));
  }

  getRecentBlockhash(): Observable<{ blockhash: string }> {
    return this.httpClient
      .post<{ result: { value: { blockhash: string } } }[]>(
        environment.rpcEndpoint,
        null,
        {
          headers: {
            'solana-network': environment.network,
            'rpc-method': 'getRecentBlockhash',
          },
        }
      )
      .pipe(map(([res]) => res.result.value));
  }
}
