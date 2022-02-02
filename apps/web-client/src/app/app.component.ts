import { Component, OnInit } from '@angular/core';
import { WalletStore } from '@heavy-duty/wallet-adapter';
import { WalletName, WalletReadyState } from '@solana/wallet-adapter-base';
import { PhantomWalletAdapter } from '@solana/wallet-adapter-wallets';
import { Keypair, PublicKey } from '@solana/web3.js';
import {
  combineLatest,
  concatMap,
  first,
  interval,
  map,
  of,
  startWith,
  switchMap,
  takeWhile,
} from 'rxjs';
import { ConnectivityStatusService } from './connectivity-status.service';
import { SolanaRpcApiService } from './solana-rpc-api.service';
import { SolanaRpcSocketService } from './solana-rpc-socket.service';
import { SystemProgramApiService } from './system-program-api.service';

@Component({
  selector: 'transaction-processor-root',
  template: `
    <ng-container transactionProcessorConnectivityStatus>
      <header>
        <h1>
          Transaction processor [{{
            (online$ | async) ? 'ONLINE' : 'OFFLINE'
          }}
          - RPC {{ (rpcConnected$ | async) ? 'CONNECTED' : 'DISCONNECTED' }}]
        </h1>

        <select
          [ngModel]="walletName$ | async"
          (ngModelChange)="onSelectWallet($event)"
        >
          <option [ngValue]="null">Not selected</option>
          <option
            *ngFor="let wallet of wallets$ | async"
            [ngValue]="wallet.adapter.name"
          >
            {{ wallet.adapter.name }} ({{ wallet.readyState }})
          </option>
        </select>

        <ng-container *ngIf="walletName$ | async as walletName">
          <ng-container *ngIf="walletPublicKey$ | async as walletPublicKey">
            <ng-container
              *ngIf="walletAccountLamports$ | async as walletAccountLamports"
            >
              <p>
                {{ walletName }} CONNECTED | Address:
                {{ walletPublicKey.toBase58() }} (LAMPORTS:
                {{ walletAccountLamports }})
              </p>
            </ng-container>
          </ng-container>
        </ng-container>

        <button
          *ngIf="(connected$ | async) === false"
          (click)="onConnect()"
          [disabled]="(isWalletReady$ | async) === false"
        >
          Connect Phantom
        </button>
        <button *ngIf="connected$ | async" (click)="onDisconnect()">
          Disconnect Phantom
        </button>
      </header>

      <main>
        <button
          *ngIf="walletPublicKey$ | async as walletPublicKey"
          (click)="onSendTransaction(walletPublicKey)"
        >
          Send transaction
        </button>
      </main>
    </ng-container>
  `,
  styles: [],
})
export class AppComponent implements OnInit {
  readonly connected$ = this._walletStore.connected$;
  readonly walletPublicKey$ = this._walletStore.publicKey$;
  readonly wallets$ = this._walletStore.wallets$;
  readonly isWalletReady$ = this._walletStore.wallet$.pipe(
    map((wallet) => wallet?.readyState === WalletReadyState.Installed)
  );
  readonly walletName$ = this._walletStore.wallet$.pipe(
    map((wallet) => wallet?.adapter.name || null)
  );
  readonly walletAccount$ = combineLatest([
    this._connectivityStatusService.online$,
    this._walletStore.publicKey$,
  ]).pipe(
    concatMap(([online, publicKey]) => {
      if (!online || !publicKey) {
        return of(null);
      }

      return this._solanaRpcApiService
        .getAccountInfo(publicKey.toBase58())
        .pipe(
          switchMap((accountInfo) =>
            this._solanaRpcSocketService
              .onAccountChange(publicKey.toBase58())
              .pipe(startWith(accountInfo))
          )
        );
    })
  );
  readonly walletAccountLamports$ = this.walletAccount$.pipe(
    map((accountInfo) => (accountInfo ? accountInfo.lamports : null))
  );
  readonly rpcConnected$ = this._solanaRpcSocketService.connected$;
  readonly online$ = this._connectivityStatusService.online$;

  constructor(
    private readonly _connectivityStatusService: ConnectivityStatusService,
    private readonly _walletStore: WalletStore,
    private readonly _solanaRpcApiService: SolanaRpcApiService,
    private readonly _solanaRpcSocketService: SolanaRpcSocketService,
    private readonly _systemProgramApiService: SystemProgramApiService
  ) {}

  ngOnInit() {
    this._walletStore.setAdapters([new PhantomWalletAdapter()]);

    this._connectivityStatusService.online$.subscribe((online) => {
      if (!online) {
        this._solanaRpcSocketService.disconnect();
      } else {
        this._solanaRpcSocketService.connect();
      }
    });
  }

  onConnect() {
    this._walletStore.connect().subscribe();
  }

  onDisconnect() {
    this._walletStore.disconnect().subscribe();
  }

  onSelectWallet(walletName: WalletName) {
    this._walletStore.selectWallet(walletName);
  }

  onSendTransaction(walletPublicKey: PublicKey) {
    this._systemProgramApiService
      .transfer({
        fromPubkey: walletPublicKey,
        toPubkey: Keypair.generate().publicKey,
        lamports: 1,
      })
      .pipe(
        concatMap((signature) =>
          combineLatest({
            signature: this._solanaRpcSocketService
              .onSignatureChange(signature)
              .pipe(
                first(),
                concatMap(() =>
                  interval(1000).pipe(
                    concatMap(() =>
                      this._solanaRpcApiService.getSignatureStatus(signature)
                    ),
                    takeWhile(
                      (signatureStatus) =>
                        signatureStatus?.confirmationStatus !== 'finalized'
                    )
                  )
                )
              ),
            transaction: this._solanaRpcSocketService
              .onSignatureChange(signature, 'finalized')
              .pipe(
                first(),
                concatMap(() =>
                  this._solanaRpcApiService.getTransaction(signature)
                ),
                startWith(null)
              ),
          })
        )
      )
      .subscribe();
  }
}
