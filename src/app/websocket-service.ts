import { Injectable } from '@angular/core';
import { WebSocketSubject, webSocket } from 'rxjs/webSocket';
import { Observable, Subject, Subscription, filter, first, timeout as rxTimeout, catchError, of } from 'rxjs';

// Eintrag aus der Server-Dateiliste (action: 'file-list' Response)
export interface WsFileEntry {
  name: string;
  size: number;
  fileType: string;
}

// Erlaubte IP-Formate fuer WebSocket-Verbindungen (private Netzwerke)
const PRIVATE_IP_REGEX = /^(10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3}|127\.\d{1,3}\.\d{1,3}\.\d{1,3}|localhost)$/;

// Timeout fuer Datei-Operationen (30s Standard, 5min fuer Downloads)
const OP_TIMEOUT = 30_000;
const DOWNLOAD_TIMEOUT = 300_000;

@Injectable({
  providedIn: 'root',
})
export class WebsocketService {
  private socket$!: WebSocketSubject<any>;
  private readonly PROD_WS_URL: string = 'ws://localhost:8080';
  private readonly SERVER_WS_URL: string = 'wss://192.168.178.212:8080';

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

  // Prueft ob eine IP-Adresse im privaten Netzwerk liegt
  static isPrivateIp(ip: string): boolean {
    return PRIVATE_IP_REGEX.test(ip);
  }

  // Entfernt gefaehrliche Zeichen aus Dateinamen (Path Traversal Schutz)
  static sanitizeFileName(name: string): string {
    return name.replace(/[/\\:*?"<>|]/g, '_').replace(/\.{2,}/g, '.');
  }

  // Erstellt eine neue WebSocket-Verbindung zur angegebenen URL
  // und leitet alle eingehenden Nachrichten an incomingMessages weiter
  private connect(url: string): void {
    this.connectedUrl = url;
    this.msgSub?.unsubscribe();

    this.socket$ = webSocket({ url });

    // Alle eingehenden Nachrichten intern weiterleiten
    this.msgSub = this.socket$.subscribe({
      next: (msg) => this.incomingMessages.next(msg),
      error: () => {},
    });
  }

  // ==================== Verbindungstest ====================

  // Testet ob ein WSS-Server auf dem Geraet laeuft.
  // Oeffnet eine temporaere Verbindung zu ws://{ip}:{port}.
  // Bei Erfolg: Haupt-Socket wird auf diese URL umgeschaltet, gibt true zurueck.
  // Bei Fehler/Timeout (5s): gibt false zurueck, Haupt-Socket bleibt unveraendert.
  public tryConnect(ip: string, port = 8080): Observable<boolean> {
    // Nur private IPs zulassen
    if (!WebsocketService.isPrivateIp(ip)) {
      return of(false);
    }

    const result = new Subject<boolean>();
    const url = `wss://${ip}:${port}`;

    // Temporaeren Test-Socket oeffnen
    const testSocket = webSocket({
      url,
      openObserver: {
        next: () => {
          // Verbindung hat geklappt
          clearTimeout(connectTimeout);
          testSocket.complete();
          // Haupt-Socket auf dieses Geraet umschalten
          this.connect(url);
          result.next(true);
          result.complete();
        }
      }
    });

    // Timeout: nach 5s aufgeben
    const connectTimeout = setTimeout(() => {
      testSocket.complete();
      result.next(false);
      result.complete();
    }, 5000);

    // Subscribe loest die eigentliche Verbindung aus.
    // Error = Geraet nicht erreichbar
    testSocket.subscribe({
      error: () => {
        clearTimeout(connectTimeout);
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
      rxTimeout(OP_TIMEOUT),
      catchError(() => {
        result.next([]);
        result.complete();
        return of();
      }),
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
    const safeName = WebsocketService.sanitizeFileName(file.name);

    // Auf die Upload-Antwort vom Server warten
    this.incomingMessages.pipe(
      filter((msg) => msg.action === 'file-upload' && msg.fileName === safeName),
      first(),
      rxTimeout(DOWNLOAD_TIMEOUT),
      catchError(() => {
        result.next(false);
        result.complete();
        return of();
      }),
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
          fileName: safeName,
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
    const safePath = WebsocketService.sanitizeFileName(filePath);

    this.incomingMessages.pipe(
      filter((msg) => msg.type === 'delete' && msg.path === safePath),
      first(),
      rxTimeout(OP_TIMEOUT),
      catchError(() => {
        result.next(false);
        result.complete();
        return of();
      }),
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

    this.socket$.next({ type: 'delete', path: safePath });

    return result.asObservable();
  }

  // Datei vom Server herunterladen (action: 'file-download').
  // Server antwortet mit { action: 'file-download', success, fileName, fileType, size, data (Base64) }
  public downloadFile(fileName: string): Observable<{ success: boolean; data?: string }> {
    const result = new Subject<{ success: boolean; data?: string }>();
    const safeName = WebsocketService.sanitizeFileName(fileName);

    this.incomingMessages.pipe(
      filter((msg) => msg.action === 'file-download' && msg.fileName === safeName),
      first(),
      rxTimeout(DOWNLOAD_TIMEOUT),
      catchError(() => {
        result.next({ success: false });
        result.complete();
        return of();
      }),
    ).subscribe({
      next: (msg) => {
        result.next({ success: msg.success === true, data: msg.data });
        result.complete();
      },
      error: () => {
        result.next({ success: false });
        result.complete();
      },
    });

    this.socket$.next({ action: 'file-download', fileName: safeName });

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
