import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { ApiService } from './api-service';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../environments/environment';
import { WebsocketService } from './websocket-service';

@Injectable({
  providedIn: 'root',
})
export class UnitTests {
  private bypassLogin: boolean = environment.bypassLogin || false;

  
  private apiConfirmedWorking: boolean = false;
  private wssServerConfirmedWorking: boolean = false;

  constructor(
    private router: Router,
    private apiService: ApiService,
    private websocketService: WebsocketService
  ) {
    if (this.bypassLogin) {
      console.log('UnitTests Service initialized');
      this.testConnection().subscribe();
      this.testWebSocket();
    }
  }

  private testConnection(): Observable<boolean> {
    return this.apiService.testConnection().pipe(
      map(response => {
        console.log('API-Verbindung erfolgreich');
        console.log(response);
        return true;
      }),
      catchError(error => {
        console.error('API-Verbindung fehlgeschlagen:', error);
        return of(false);
      })
    );
  }

  private testWebSocket(): void {
    this.websocketService.getMessages().subscribe({
      next: (message: any) => {
        console.log('WebSocket-Nachricht empfangen:', message);
        this.wssServerConfirmedWorking = true;
      },
      error: (error: any) => {
        console.error('WebSocket-Fehler:', error);
        this.wssServerConfirmedWorking = false;
      }
    });

    if (!this.wssServerConfirmedWorking) {
      this.websocketService.closeConnection();
    }
  }
}
