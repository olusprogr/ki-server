import { Injectable } from '@angular/core';
import { WebSocketSubject, webSocket } from 'rxjs/webSocket';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class WebsocketService {
  private socket$: WebSocketSubject<any>;

  constructor(  ) {
    this.socket$ = webSocket({
      url: 'ws://localhost:8080',
      openObserver: {
        next: () => console.log('WebSocket connection established!')
      }
    });
  }

  public sendMessage(msg: any): void {
    this.socket$.next(msg);
  }

  public getMessages(): Observable<any> {
    return this.socket$.asObservable();
  }

  public closeConnection(): void {
    this.socket$.complete();
  }
}
