import { ModuleWithProviders, NgModule } from '@angular/core';
import { SolanaRpcApiService } from './api';
import { SolanaRpcSocketService } from './socket';
import { solanaRpcConfigProviderFactory } from './solana-rpc.config';

@NgModule({})
export class SolanaRpcModule {
  static forRoot(
    apiEndpoint: string,
    websocketEndpoint: string
  ): ModuleWithProviders<SolanaRpcModule> {
    return {
      ngModule: SolanaRpcModule,
      providers: [
        solanaRpcConfigProviderFactory({ apiEndpoint, websocketEndpoint }),
        SolanaRpcApiService,
        SolanaRpcSocketService,
      ],
    };
  }
}
