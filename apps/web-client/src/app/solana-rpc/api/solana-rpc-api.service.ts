import { HttpClient } from '@angular/common/http';
import { Inject, Injectable } from '@angular/core';
import {
  AccountInfo,
  PublicKey,
  SignatureStatus,
  Transaction,
  TransactionResponse,
} from '@solana/web3.js';
import { concatMap, map, Observable } from 'rxjs';
import { SolanaRpcConfig, SOLANA_RPC_CONFIG } from '../solana-rpc.config';

@Injectable()
export class SolanaRpcApiService {
  constructor(
    @Inject(SOLANA_RPC_CONFIG)
    private readonly _solanaRpcConfig: SolanaRpcConfig,
    private readonly _httpClient: HttpClient
  ) {}

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
    return this._httpClient
      .post<{
        value: AccountInfo<string>;
        context: { slot: number };
      }>(this._solanaRpcConfig.apiEndpoint, pubkey, {
        headers: {
          'solana-rpc-method': 'getAccountInfo',
        },
      })
      .pipe(map(({ value }) => value));
  }

  getBalance(pubkey: string) {
    return this._httpClient.post<{ value: number }>(
      this._solanaRpcConfig.apiEndpoint,
      pubkey,
      {
        headers: {
          'solana-rpc-method': 'getBalance',
        },
      }
    );
  }

  getRecentBlockhash(): Observable<{ blockhash: string }> {
    return this._httpClient
      .post<{ value: { blockhash: string } }>(
        this._solanaRpcConfig.apiEndpoint,
        null,
        {
          headers: {
            'solana-rpc-method': 'getRecentBlockhash',
          },
        }
      )
      .pipe(map(({ value }) => value));
  }

  getSignatureStatus(signature: string): Observable<SignatureStatus> {
    return this._httpClient
      .post<{ value: SignatureStatus[] }>(
        this._solanaRpcConfig.apiEndpoint,
        [[signature], { searchTransactionHistory: true }],
        {
          headers: {
            'solana-rpc-method': 'getSignatureStatuses',
          },
        }
      )
      .pipe(map(({ value: [status] }) => status));
  }

  getTransaction(signature: string): Observable<TransactionResponse> {
    return this._httpClient.post<TransactionResponse>(
      this._solanaRpcConfig.apiEndpoint,
      signature,
      {
        headers: {
          'solana-rpc-method': 'getTransaction',
        },
      }
    );
  }

  sendTransaction(transaction: Transaction): Observable<string> {
    return this._httpClient.post<string>(
      this._solanaRpcConfig.apiEndpoint,
      transaction,
      {
        headers: {
          'solana-rpc-method': 'sendTransaction',
        },
      }
    );
  }
}
