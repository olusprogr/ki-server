import { Injectable } from '@angular/core';
import { WebSocketSubject, webSocket } from 'rxjs/webSocket';
import { Observable, Subject, Subscription, filter, first, timeout as rxTimeout, catchError, of } from 'rxjs';

// Eintrag aus der Server-Dateiliste (action: 'file-list' Response)
export interface WsFileEntry {
  name: string;
  size: number;
  fileType: string;
}

// Fortschritt fuer laufende Up-/Downloads
export interface TransferProgress {
  fileName: string;
  transferred: number; // Bytes bereits uebertragen
  total: number;       // Gesamtgroesse in Bytes
  percent: number;     // 0-100
}

// Erlaubte IP-Formate fuer WebSocket-Verbindungen (private Netzwerke + eigene Domain)
const PRIVATE_IP_REGEX = /^(10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3}|127\.\d{1,3}\.\d{1,3}\.\d{1,3}|localhost|olusprogr\.dynv6\.net)$/;

const OP_TIMEOUT = 30_000;

// Chunk-Groesse beim Upload: 1 MB
const UPLOAD_CHUNK_SIZE = 1 * 1024 * 1024;

@Injectable({
  providedIn: 'root',
})
export class WebsocketService {
  private socket$!: WebSocketSubject<any>;
  private readonly PROD_WS_URL: string = 'wss://olusprogr.dynv6.net:8080';

  private connectedUrl: string | null = null;
  private msgSub: Subscription | null = null;
  private incomingMessages = new Subject<any>();

  // Upload-Queue: serialisiert mehrere gleichzeitige Upload-Anfragen
  private uploadQueue: Array<() => void> = [];
  private uploadRunning = false;

  constructor() {
    this.connect(this.PROD_WS_URL);
  }

  static isPrivateIp(ip: string): boolean {
    return PRIVATE_IP_REGEX.test(ip);
  }

  static sanitizeFileName(name: string): string {
    return name.replace(/[/\\:*?"<>|]/g, '_').replace(/\.{2,}/g, '.');
  }

  private connect(url: string): void {
    this.connectedUrl = url;
    this.msgSub?.unsubscribe();
    this.socket$ = webSocket({ url });
    this.msgSub = this.socket$.subscribe({
      next: (msg) => this.incomingMessages.next(msg),
      error: () => {},
    });
  }

  // ==================== Verbindungstest ====================

  private tryUrl(url: string, result: Subject<boolean>, onFail: () => void): void {
    const testSocket = webSocket({
      url,
      openObserver: {
        next: () => {
          clearTimeout(connectTimeout);
          testSocket.complete();
          this.connect(url);
          result.next(true);
          result.complete();
        }
      }
    });

    const connectTimeout = setTimeout(() => {
      testSocket.complete();
      onFail();
    }, 5000);

    testSocket.subscribe({ error: () => { clearTimeout(connectTimeout); onFail(); } });
  }

  public tryConnect(ip: string, port = 8080): Observable<boolean> {
    const result = new Subject<boolean>();
    this.tryUrl(this.PROD_WS_URL, result, () => {
      if (WebsocketService.isPrivateIp(ip)) {
        this.tryUrl(`wss://${ip}:${port}`, result, () => { result.next(false); result.complete(); });
      } else {
        result.next(false);
        result.complete();
      }
    });
    return result.asObservable();
  }

  // ==================== Dateiliste ====================

  public listFiles(): Observable<WsFileEntry[]> {
    const result = new Subject<WsFileEntry[]>();
    this.incomingMessages.pipe(
      filter((msg) => msg.action === 'file-list'),
      first(),
      rxTimeout(OP_TIMEOUT),
      catchError(() => { result.next([]); result.complete(); return of(); }),
    ).subscribe({
      next: (msg) => { result.next(msg.success ? (msg.files || []) : []); result.complete(); },
      error: () => { result.next([]); result.complete(); },
    });
    this.socket$.next({ action: 'file-list' });
    return result.asObservable();
  }

  // ==================== Chunked Upload ====================

  // Gibt Fortschritt (0-100%) zurueck, abschliessend true/false als letzter Wert
  public sendFile(file: File, onProgress?: (p: TransferProgress) => void): Observable<boolean> {
    const result = new Subject<boolean>();

    this.uploadQueue.push(() => this.executeUpload(file, onProgress, result));
    this.drainUploadQueue();

    return result.asObservable();
  }

  private drainUploadQueue(): void {
    if (this.uploadRunning || this.uploadQueue.length === 0) return;
    this.uploadRunning = true;
    const next = this.uploadQueue.shift()!;
    next();
  }

  private executeUpload(file: File, onProgress: ((p: TransferProgress) => void) | undefined, result: Subject<boolean>): void {
    const safeName = WebsocketService.sanitizeFileName(file.name);
    const totalChunks = Math.ceil(file.size / UPLOAD_CHUNK_SIZE);
    let cancelled = false;

    const finish = (ok: boolean) => {
      result.next(ok);
      result.complete();
      this.uploadRunning = false;
      this.drainUploadQueue();
    };

    // Auf upload-start Antwort warten bevor Chunks gesendet werden
    const startSub = this.incomingMessages.pipe(
      filter((msg) => msg.action === 'upload-start' && msg.fileName === safeName),
      first(),
      rxTimeout(15_000),
      catchError(() => { finish(false); return of(null); }),
    ).subscribe((msg) => {
      if (!msg) return;
      if (msg.skipped) { finish(true); return; }
      if (!msg.success) { finish(false); return; }
      this.sendNextChunk(file, safeName, 0, totalChunks, result, onProgress, () => cancelled);
    });

    // Auf ACKs hoeren (Flow-Control + Fortschritt)
    const ackSub = this.incomingMessages.pipe(
      filter((msg) => msg.action === 'upload-chunk-ack' && msg.fileName === safeName),
    ).subscribe((msg) => {
      if (cancelled) return;
      if (onProgress) {
        const transferred = Math.min((msg.chunkIndex + 1) * UPLOAD_CHUNK_SIZE, file.size);
        onProgress({ fileName: safeName, transferred, total: file.size, percent: Math.round(transferred / file.size * 100) });
      }
    });

    // Auf Abschluss oder Fehler hoeren
    const doneSub = this.incomingMessages.pipe(
      filter((msg) => (msg.action === 'upload-error' || msg.action === 'upload-complete') && msg.fileName === safeName),
      first(),
      rxTimeout(6 * 60 * 60_000),
      catchError(() => { startSub.unsubscribe(); ackSub.unsubscribe(); finish(false); return of(null); }),
    ).subscribe((msg) => {
      startSub.unsubscribe();
      ackSub.unsubscribe();
      doneSub.unsubscribe();
      if (!msg) return;
      finish(msg.action === 'upload-complete' && msg.success === true);
    });

    this.socket$.next({ action: 'upload-start', fileName: safeName, totalChunks, fileSize: file.size });
  }

  // Liest einen Chunk aus der Datei und sendet ihn
  private sendNextChunk(
    file: File,
    safeName: string,
    chunkIndex: number,
    totalChunks: number,
    result: Subject<boolean>,
    onProgress: ((p: TransferProgress) => void) | undefined,
    isCancelled: () => boolean
  ): void {
    if (isCancelled()) return;
    if (chunkIndex >= totalChunks) return; // warten auf upload-complete vom Server

    const start = chunkIndex * UPLOAD_CHUNK_SIZE;
    const end = Math.min(start + UPLOAD_CHUNK_SIZE, file.size);
    const slice = file.slice(start, end);

    const reader = new FileReader();
    reader.onload = () => {
      if (isCancelled()) return;
      const base64 = (reader.result as string).split(',')[1];
      this.socket$.next({ action: 'upload-chunk', fileName: safeName, chunkIndex, data: base64 });

      // Naechsten Chunk sofort vorbereiten (Pipeline: ein Chunk voraus)
      if (chunkIndex + 1 < totalChunks) {
        this.sendNextChunk(file, safeName, chunkIndex + 1, totalChunks, result, onProgress, isCancelled);
      }
    };
    reader.onerror = () => { result.next(false); result.complete(); };
    reader.readAsDataURL(slice);
  }

  // ==================== Chunked Download ====================

  public downloadFile(fileName: string, onProgress?: (p: TransferProgress) => void): Observable<{ success: boolean; blob?: Blob }> {
    const result = new Subject<{ success: boolean; blob?: Blob }>();
    const safeName = WebsocketService.sanitizeFileName(fileName);

    const chunks: Uint8Array[] = [];
    let totalChunks = 0;
    let fileSize = 0;
    let receivedChunks = 0;

    // download-start: Metadaten empfangen
    const startSub = this.incomingMessages.pipe(
      filter((msg) => msg.action === 'download-start' && msg.fileName === safeName),
      first(),
      rxTimeout(15_000),
      catchError(() => { result.next({ success: false }); result.complete(); return of(null); }),
    ).subscribe((msg) => {
      if (!msg) return;
      totalChunks = msg.totalChunks;
      fileSize = msg.fileSize;
    });

    // download-chunk: Chunks sammeln
    const chunkSub = this.incomingMessages.pipe(
      filter((msg) => msg.action === 'download-chunk' && msg.fileName === safeName),
    ).subscribe((msg) => {
      const binary = atob(msg.data);
      const arr = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) arr[i] = binary.charCodeAt(i);
      chunks[msg.chunkIndex] = arr;
      receivedChunks++;

      if (onProgress && fileSize > 0) {
        const transferred = Math.min(receivedChunks * UPLOAD_CHUNK_SIZE, fileSize);
        onProgress({ fileName: safeName, transferred, total: fileSize, percent: Math.round(transferred / fileSize * 100) });
      }
    });

    // download-complete / download-error
    const doneSub = this.incomingMessages.pipe(
      filter((msg) => (msg.action === 'download-complete' || msg.action === 'download-error') && msg.fileName === safeName),
      first(),
      rxTimeout(6 * 60 * 60_000),
      catchError(() => { result.next({ success: false }); result.complete(); return of(null); }),
    ).subscribe((msg) => {
      startSub.unsubscribe();
      chunkSub.unsubscribe();
      doneSub.unsubscribe();
      if (!msg || msg.action === 'download-error') {
        result.next({ success: false });
        result.complete();
        return;
      }
      // Alle Chunks zusammenfuegen
      const totalBytes = chunks.reduce((s, c) => s + c.length, 0);
      const merged = new Uint8Array(totalBytes);
      let offset = 0;
      for (const chunk of chunks) { merged.set(chunk, offset); offset += chunk.length; }
      const blob = new Blob([merged], { type: 'application/octet-stream' });
      result.next({ success: true, blob });
      result.complete();
    });

    this.socket$.next({ action: 'file-download', fileName: safeName });
    return result.asObservable();
  }

  // ==================== Datei loeschen ====================

  public deleteFile(filePath: string): Observable<boolean> {
    const result = new Subject<boolean>();
    const safePath = WebsocketService.sanitizeFileName(filePath);
    this.incomingMessages.pipe(
      filter((msg) => msg.type === 'delete' && msg.path === safePath),
      first(),
      rxTimeout(OP_TIMEOUT),
      catchError(() => { result.next(false); result.complete(); return of(); }),
    ).subscribe({
      next: (msg) => { result.next(msg.success === true); result.complete(); },
      error: () => { result.next(false); result.complete(); },
    });
    this.socket$.next({ type: 'delete', path: safePath });
    return result.asObservable();
  }

  // ==================== Basis-Methoden ====================

  public getConnectedUrl(): string | null { return this.connectedUrl; }
  public sendMessage(msg: any): void { this.socket$.next(msg); }
  public getMessages(): Observable<any> { return this.incomingMessages.asObservable(); }

  public closeConnection(): void {
    this.msgSub?.unsubscribe();
    this.msgSub = null;
    this.socket$.complete();
    this.connectedUrl = null;
  }
}
