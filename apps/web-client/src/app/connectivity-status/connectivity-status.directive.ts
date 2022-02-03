import { Directive, HostListener } from '@angular/core';
import { ConnectivityStatusService } from './connectivity-status.service';

@Directive({
  selector: '[transactionProcessorConnectivityStatus]',
})
export class ConnectivityStatusDirective {
  constructor(
    private readonly _connectivityStatusService: ConnectivityStatusService
  ) {}

  @HostListener('window:offline')
  setNetworkOffline() {
    this._connectivityStatusService.online = false;
  }

  @HostListener('window:online')
  setNetworkOnline() {
    this._connectivityStatusService.online = true;
  }
}
