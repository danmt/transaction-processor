import { ModuleWithProviders, NgModule } from '@angular/core';
import { ConnectivityStatusDirective } from './connectivity-status.directive';
import { ConnectivityStatusService } from './connectivity-status.service';

@NgModule({
  declarations: [ConnectivityStatusDirective],
  providers: [],
  exports: [ConnectivityStatusDirective],
})
export class ConnectivityStatusModule {
  static forRoot(): ModuleWithProviders<ConnectivityStatusModule> {
    return {
      ngModule: ConnectivityStatusModule,
      providers: [ConnectivityStatusService],
    };
  }
}
