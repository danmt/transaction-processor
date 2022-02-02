import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BrowserModule } from '@angular/platform-browser';
import { HdWalletAdapterModule } from '@heavy-duty/wallet-adapter';
import { AppComponent } from './app.component';
import { SolanaAuthInterceptor } from './solana-auth.interceptor';
import { SolanaRpcInterceptor } from './solana-rpc.interceptor';

@NgModule({
  declarations: [AppComponent],
  imports: [
    BrowserModule,
    FormsModule,
    HttpClientModule,
    HdWalletAdapterModule.forRoot({
      autoConnect: true,
    }),
  ],
  providers: [
    {
      provide: HTTP_INTERCEPTORS,
      useClass: SolanaAuthInterceptor,
      multi: true,
    },
    {
      provide: HTTP_INTERCEPTORS,
      useClass: SolanaRpcInterceptor,
      multi: true,
    },
  ],
  bootstrap: [AppComponent],
})
export class AppModule {}
