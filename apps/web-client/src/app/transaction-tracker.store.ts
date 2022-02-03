import { Injectable } from '@angular/core';
import { ComponentStore } from '@ngrx/component-store';
import {
  SignatureStatus,
  Transaction,
  TransactionConfirmationStatus,
  TransactionResponse,
  TransactionSignature,
} from '@solana/web3.js';
import {
  concatMap,
  first,
  interval,
  mergeMap,
  Observable,
  takeWhile,
  tap,
} from 'rxjs';
import { SolanaRpcApiService } from './solana-rpc-api.service';
import { SolanaRpcSocketService } from './solana-rpc-socket.service';

interface TransactionStatus {
  transaction: Transaction;
  signature: TransactionSignature;
  signatureStatus?: SignatureStatus;
  confirmationStatus?: TransactionConfirmationStatus;
  transactionResponse?: TransactionResponse;
}

interface ViewModel {
  transactionStatuses: TransactionStatus[];
}

const initialState: ViewModel = {
  transactionStatuses: [],
};

@Injectable({
  providedIn: 'root',
})
export class TransactionTrackerStore extends ComponentStore<ViewModel> {
  readonly transactionStatuses$ = this.select(
    ({ transactionStatuses }) => transactionStatuses
  );
  readonly isProcessing$ = this.select(
    this.transactionStatuses$,
    (transactionStatuses) =>
      transactionStatuses.some(
        ({ confirmationStatus }) => confirmationStatus !== 'finalized'
      )
  );

  constructor(
    private readonly _solanaRpcSocketService: SolanaRpcSocketService,
    private readonly _solanaRpcApiService: SolanaRpcApiService
  ) {
    super(initialState);
  }

  private readonly _addTransactionStatus = this.updater(
    (
      state,
      transactionStatus: {
        signature: TransactionSignature;
        transaction: Transaction;
      }
    ) => ({
      ...state,
      transactionStatuses: [...state.transactionStatuses, transactionStatus],
    })
  );

  private readonly _setConfirmationStatus = this.updater(
    (
      state,
      {
        signature,
        confirmationStatus,
      }: {
        signature: string;
        confirmationStatus: TransactionConfirmationStatus;
      }
    ) => ({
      ...state,
      transactionStatuses: state.transactionStatuses.map((transactionStatus) =>
        transactionStatus.signature === signature
          ? { ...transactionStatus, confirmationStatus }
          : transactionStatus
      ),
    })
  );

  private readonly _setSignatureStatus = this.updater(
    (
      state,
      {
        signature,
        signatureStatus,
      }: {
        signature: string;
        signatureStatus: SignatureStatus;
      }
    ) => ({
      ...state,
      transactionStatuses: state.transactionStatuses.map((transactionStatus) =>
        transactionStatus.signature === signature
          ? { ...transactionStatus, signatureStatus }
          : transactionStatus
      ),
    })
  );

  private readonly _setTransactionResponse = this.updater(
    (
      state,
      {
        signature,
        transactionResponse,
      }: {
        signature: string;
        transactionResponse: TransactionResponse;
      }
    ) => ({
      ...state,
      transactionStatuses: state.transactionStatuses.map((transactionStatus) =>
        transactionStatus.signature === signature
          ? { ...transactionStatus, transactionResponse }
          : transactionStatus
      ),
    })
  );

  private readonly _handleTransactionProcessed = this.effect(
    ($: Observable<{ signature: TransactionSignature }>) =>
      $.pipe(
        mergeMap(({ signature }) =>
          this._solanaRpcSocketService
            .onSignatureChange(signature, 'processed')
            .pipe(
              first(),
              tap(() =>
                this._setConfirmationStatus({
                  signature,
                  confirmationStatus: 'processed',
                })
              )
            )
        )
      )
  );

  private readonly _handleTransactionConfirmed = this.effect(
    ($: Observable<{ signature: TransactionSignature }>) =>
      $.pipe(
        mergeMap(({ signature }) =>
          this._solanaRpcSocketService
            .onSignatureChange(signature, 'confirmed')
            .pipe(
              first(),
              tap(() =>
                this._setConfirmationStatus({
                  signature,
                  confirmationStatus: 'confirmed',
                })
              ),
              concatMap(() =>
                interval(1000).pipe(
                  concatMap(() =>
                    this._solanaRpcApiService
                      .getSignatureStatus(signature)
                      .pipe(
                        tap((signatureStatus) =>
                          this._setSignatureStatus({
                            signature,
                            signatureStatus,
                          })
                        )
                      )
                  ),
                  takeWhile(
                    (signatureStatus) =>
                      signatureStatus?.confirmationStatus !== 'finalized'
                  )
                )
              )
            )
        )
      )
  );

  private readonly _handleTransactionFinalized = this.effect(
    ($: Observable<{ signature: TransactionSignature }>) =>
      $.pipe(
        mergeMap(({ signature }) =>
          this._solanaRpcSocketService
            .onSignatureChange(signature, 'finalized')
            .pipe(
              first(),
              tap(() =>
                this._setConfirmationStatus({
                  signature,
                  confirmationStatus: 'finalized',
                })
              ),
              concatMap(() =>
                this._solanaRpcApiService.getTransaction(signature).pipe(
                  tap((transactionResponse) =>
                    this._setTransactionResponse({
                      signature,
                      transactionResponse,
                    })
                  )
                )
              )
            )
        )
      )
  );

  reportProgress(transaction: Transaction, signature: string) {
    this._addTransactionStatus({ transaction, signature });
    this._handleTransactionConfirmed({ signature });
    this._handleTransactionProcessed({ signature });
    this._handleTransactionFinalized({ signature });
  }
}
