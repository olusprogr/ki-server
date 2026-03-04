import { Injectable } from '@angular/core';
import { WebSocketSubject, webSocket } from 'rxjs/webSocket';
import { Observable, Subject, Subscription, filter, first } from 'rxjs';

// Eintrag aus der Server-Dateiliste (action: 'file-list' Response)
export interface WsFileEntry {
  name: string;
  size: number;
  fileType: string;
}

@Injectable({
  providedIn: 'root',
})
export class WebsocketService {
  private socket$!: WebSocketSubject<any>;
  private readonly PROD_WS_URL: string = 'ws://localhost:8080';
  private readonly SERVER_WS_URL: string = 'ws://192.168.178.212:8080';

  // Aktuell verbundene URL (null = nicht verbunden)
  private connectedUrl: string | null = null;

  // Subscription auf eingehende Nachrichten (wird bei reconnect neu erstellt)
  private msgSub: Subscription | null = null;

  // Subject fuer alle eingehenden WSS-Nachrichten (intern zum Filtern)
  private incomingMessages = new Subject<any>();

  constructor() {
    // Standard-Verbindung beim App-Start
    this.connect(this.PROD_WS_URL);
  }

  // Erstellt eine neue WebSocket-Verbindung zur angegebenen URL
  // und leitet alle eingehenden Nachrichten an incomingMessages weiter
  private connect(url: string): void {
    this.connectedUrl = url;
    this.msgSub?.unsubscribe();

    this.socket$ = webSocket({
      url,
      openObserver: {
        next: () => console.log(`WebSocket connection established to ${url}`)
      }
    });

    // Alle eingehenden Nachrichten intern weiterleiten
    this.msgSub = this.socket$.subscribe({
      next: (msg) => this.incomingMessages.next(msg),
      error: (err) => console.error('WebSocket error:', err),
    });
  }

  // ==================== Verbindungstest ====================

  // Testet ob ein WSS-Server auf dem Geraet laeuft.
  // Oeffnet eine temporaere Verbindung zu ws://{ip}:{port}.
  // Bei Erfolg: Haupt-Socket wird auf diese URL umgeschaltet, gibt true zurueck.
  // Bei Fehler/Timeout (5s): gibt false zurueck, Haupt-Socket bleibt unveraendert.
  public tryConnect(ip: string, port = 8080): Observable<boolean> {
    const result = new Subject<boolean>();
    const url = `ws://${ip}:${port}`;

    // Temporaeren Test-Socket oeffnen
    const testSocket = webSocket({
      url,
      openObserver: {
        next: () => {
          // Verbindung hat geklappt
          clearTimeout(timeout);
          testSocket.complete();
          // Haupt-Socket auf dieses Geraet umschalten
          this.connect(url);
          result.next(true);
          result.complete();
        }
      }
    });

    // Timeout: nach 5s aufgeben
    const timeout = setTimeout(() => {
      testSocket.complete();
      result.next(false);
      result.complete();
    }, 5000);

    // Subscribe loest die eigentliche Verbindung aus.
    // Error = Geraet nicht erreichbar
    testSocket.subscribe({
      error: () => {
        clearTimeout(timeout);
        result.next(false);
        result.complete();
      }
    });

    return result.asObservable();
  }

  // ==================== Datei-Operationen ====================

  // Dateiliste vom Server holen (action: 'file-list').
  // Server antwortet mit { action: 'file-list', success, files: WsFileEntry[] }
  public listFiles(): Observable<WsFileEntry[]> {
    const result = new Subject<WsFileEntry[]>();

    // Auf die Antwort mit action='file-list' warten
    this.incomingMessages.pipe(
      filter((msg) => msg.action === 'file-list'),
      first(),
    ).subscribe({
      next: (msg) => {
        result.next(msg.success ? (msg.files || []) : []);
        result.complete();
      },
      error: () => {
        result.next([]);
        result.complete();
      },
    });

    // Request senden
    this.socket$.next({ action: 'file-list' });

    return result.asObservable();
  }

  // Datei als Base64 ueber den WebSocket an den Server senden.
  // Sendet { action: 'file-upload', fileName, fileType, fileSize, data }
  // Wartet auf Server-Antwort { action: 'file-upload', success: true/false }
  public sendFile(file: File): Observable<boolean> {
    const result = new Subject<boolean>();

    // Auf die Upload-Antwort vom Server warten
    this.incomingMessages.pipe(
      filter((msg) => msg.action === 'file-upload' && msg.fileName === file.name),
      first(),
    ).subscribe({
      next: (msg) => {
        result.next(msg.success === true);
        result.complete();
      },
      error: () => {
        result.next(false);
        result.complete();
      },
    });

    // Datei lesen und senden
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const base64 = (reader.result as string).split(',')[1];
        this.socket$.next({
          action: 'file-upload',
          fileName: file.name,
          fileType: file.type || 'unknown',
          fileSize: file.size,
          data: base64,
        });
      } catch {
        result.next(false);
        result.complete();
      }
    };
    reader.onerror = () => {
      result.next(false);
      result.complete();
    };
    reader.readAsDataURL(file);

    return result.asObservable();
  }

  // Datei auf dem Server loeschen (type: 'delete').
  // Server antwortet mit { type: 'delete', success: true/false }
  public deleteFile(filePath: string): Observable<boolean> {
    const result = new Subject<boolean>();

    this.incomingMessages.pipe(
      filter((msg) => msg.type === 'delete' && msg.path === filePath),
      first(),
    ).subscribe({
      next: (msg) => {
        result.next(msg.success === true);
        result.complete();
      },
      error: () => {
        result.next(false);
        result.complete();
      },
    });

    this.socket$.next({ type: 'delete', path: filePath });

    return result.asObservable();
  }

  // ==================== Basis-Methoden ====================

  public getConnectedUrl(): string | null {
    return this.connectedUrl;
  }

  // Nachricht ueber den aktiven Socket senden
  public sendMessage(msg: any): void {
    this.socket$.next(msg);
  }

  // Observable fuer eingehende Nachrichten (fuer externe Subscriber)
  public getMessages(): Observable<any> {
    return this.incomingMessages.asObservable();
  }

  // Verbindung trennen und URL zuruecksetzen
  public closeConnection(): void {
    this.msgSub?.unsubscribe();
    this.msgSub = null;
    this.socket$.complete();
    this.connectedUrl = null;
  }
}
