import { Component, OnInit } from '@angular/core';
import { WalletStore } from '@heavy-duty/wallet-adapter';
import { WalletName, WalletReadyState } from '@solana/wallet-adapter-base';
import { PhantomWalletAdapter } from '@solana/wallet-adapter-wallets';
import { Keypair, PublicKey } from '@solana/web3.js';
import { concatMap, map, of } from 'rxjs';
import { SolanaRpcApiService } from './solana-rpc-api.service';
import { SystemProgramApiService } from './system-program-api.service';

@Component({
  selector: 'transaction-processor-root',
  template: `
    <header>
      <h1>Transaction processor</h1>

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
          <ng-container *ngIf="walletBalance$ | async as walletBalance">
            <p>
              {{ walletName }} CONNECTED | Address:
              {{ walletPublicKey.toBase58() }} (LAMPORTS: {{ walletBalance }})
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
  readonly walletBalance$ = this._walletStore.publicKey$.pipe(
    concatMap((publicKey) =>
      publicKey
        ? this._solanaRpcApiService.getBalance(publicKey.toBase58())
        : of(null)
    )
  );

  constructor(
    private readonly _walletStore: WalletStore,
    private readonly _solanaRpcApiService: SolanaRpcApiService,
    private readonly _systemProgramApiService: SystemProgramApiService
  ) {}

  ngOnInit() {
    this._walletStore.setAdapters([new PhantomWalletAdapter()]);
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
      .subscribe();
  }
}
