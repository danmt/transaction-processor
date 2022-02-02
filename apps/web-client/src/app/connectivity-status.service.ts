import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ConnectivityStatusService {
  private readonly _online!: BehaviorSubject<boolean>;
  readonly online$!: Observable<boolean>;
  set online(value: boolean) {
    this._online.next(value);
  }

  constructor() {
    try {
      this._online = new BehaviorSubject<boolean>(window.navigator.onLine);
      this.online$ = this._online.asObservable();
    } catch (err) {
      console.error(err);
    }
  }
}
