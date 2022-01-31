import { Injectable } from '@angular/core';
import {
  CreateAccountParams,
  CreateAccountWithSeedParams,
  SystemProgram,
  TransferParams,
  TransferWithSeedParams,
} from '@solana/web3.js';
import { SolanaRpcApiService } from './solana-rpc-api.service';

@Injectable({ providedIn: 'root' })
export class SystemProgramApiService {
  constructor(private readonly _solanaRpcApiService: SolanaRpcApiService) {}

  createAccount(params: CreateAccountParams) {
    return this._solanaRpcApiService.createAndSendTransaction(
      params.fromPubkey,
      (transaction) => transaction.add(SystemProgram.createAccount(params))
    );
  }

  createAccountWithSeed(params: CreateAccountWithSeedParams) {
    return this._solanaRpcApiService.createAndSendTransaction(
      params.fromPubkey,
      (transaction) =>
        transaction.add(SystemProgram.createAccountWithSeed(params))
    );
  }

  transfer(params: TransferParams | TransferWithSeedParams) {
    return this._solanaRpcApiService.createAndSendTransaction(
      params.fromPubkey,
      (transaction) => transaction.add(SystemProgram.transfer(params))
    );
  }
}
