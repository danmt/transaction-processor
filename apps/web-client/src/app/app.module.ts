import { HttpClientModule } from '@angular/common/http';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BrowserModule } from '@angular/platform-browser';
import { HdWalletAdapterModule } from '@heavy-duty/wallet-adapter';
import { environment } from '../environments/environment';
import { AppComponent } from './app.component';
import { ConnectivityStatusModule } from './connectivity-status';
import {
  solanaRpcApiInterceptorProviders,
  SolanaRpcModule,
} from './solana-rpc';
import {
  transactionTrackerInterceptorProvider,
  TransactionTrackerModule,
} from './transaction-tracker';

@NgModule({
  declarations: [AppComponent],
  imports: [
    BrowserModule,
    FormsModule,
    HttpClientModule,
    HdWalletAdapterModule.forRoot({
      autoConnect: true,
    }),
    SolanaRpcModule.forRoot(environment.rpcEndpoint, environment.rpcWebsocket),
    ConnectivityStatusModule.forRoot(),
    TransactionTrackerModule.forRoot(),
  ],
  providers: [
    transactionTrackerInterceptorProvider,
    solanaRpcApiInterceptorProviders,
  ],
  bootstrap: [AppComponent],
})
export class AppModule {}
