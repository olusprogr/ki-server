import { Injectable } from '@angular/core';
import { WebSocketSubject, webSocket } from 'rxjs/webSocket';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class WebsocketService {
  private socket$: WebSocketSubject<any>;
  private readonly PROD_WS_URL: string = 'ws://localhost:8080';
  private readonly SERVER_WS_URL: string = 'ws://192.168.178.212:8080';


  constructor(  ) {
    this.socket$ = webSocket({
      url: this.SERVER_WS_URL,
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
