import { InjectionToken } from '@angular/core';

export interface SolanaRpcConfig {
  apiEndpoint: string;
  websocketEndpoint: string;
}

export const SOLANA_RPC_CONFIG = new InjectionToken<SolanaRpcConfig>(
  'rpcConfig'
);

export const solanaRpcConfigProviderFactory = (config: SolanaRpcConfig) => ({
  provide: SOLANA_RPC_CONFIG,
  useValue: config,
});
