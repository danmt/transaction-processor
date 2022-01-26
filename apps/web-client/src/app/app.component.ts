import { Component, OnInit } from '@angular/core';
import { ConnectionStore, WalletStore } from '@heavy-duty/wallet-adapter';
import { WalletName, WalletReadyState } from '@solana/wallet-adapter-base';
import { PhantomWalletAdapter } from '@solana/wallet-adapter-wallets';
import { map } from 'rxjs';

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

    <main></main>
  `,
  styles: [],
})
export class AppComponent implements OnInit {
  readonly connected$ = this._walletStore.connected$;
  readonly wallets$ = this._walletStore.wallets$;
  readonly isWalletReady$ = this._walletStore.wallet$.pipe(
    map((wallet) => wallet?.readyState === WalletReadyState.Installed)
  );
  readonly walletName$ = this._walletStore.wallet$.pipe(
    map((wallet) => wallet?.adapter.name || null)
  );

  constructor(
    private readonly _connectionStore: ConnectionStore,
    private readonly _walletStore: WalletStore
  ) {}

  ngOnInit() {
    this._connectionStore.setEndpoint('https://api.devnet.solana.com');
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
}
