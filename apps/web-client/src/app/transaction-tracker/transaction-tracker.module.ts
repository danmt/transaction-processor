import { ModuleWithProviders, NgModule } from '@angular/core';
import { TransactionTrackerStore } from './transaction-tracker.store';

@NgModule({})
export class TransactionTrackerModule {
  static forRoot(): ModuleWithProviders<TransactionTrackerModule> {
    return {
      ngModule: TransactionTrackerModule,
      providers: [TransactionTrackerStore],
    };
  }
}
