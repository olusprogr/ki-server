import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { WebSocketSubject, webSocket } from 'rxjs/webSocket';
import { filter, first, timeout, catchError, of } from 'rxjs';
import { verifyShareToken } from '../auth/share-token';
import { WebsocketService } from '../websocket-service';

@Component({
  selector: 'app-file-share',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './file-share.html',
})
export class FileShareComponent implements OnInit, OnDestroy {
  fileName = '';
  status: 'connecting' | 'downloading' | 'done' | 'error' = 'connecting';
  errorMessage = '';
  fileSize = '';
  progress = 0;

  private socket$: WebSocketSubject<any> | null = null;

  constructor(private route: ActivatedRoute) {}

  ngOnInit(): void {
    const token = this.route.snapshot.paramMap.get('token');
    if (!token) {
      this.status = 'error';
      this.errorMessage = 'Ungültiger Link';
      return;
    }

    this.verifyAndDownload(token);
  }

  ngOnDestroy(): void {
    this.socket$?.complete();
  }

  private async verifyAndDownload(token: string): Promise<void> {
    const payload = await verifyShareToken(token);

    if (!payload) {
      this.status = 'error';
      this.errorMessage = 'Ungültiger oder abgelaufener Link';
      return;
    }

    if (!WebsocketService.isPrivateIp(payload.ip)) {
      this.status = 'error';
      this.errorMessage = 'Ungültiger Link';
      return;
    }

    this.fileName = WebsocketService.sanitizeFileName(payload.fileName);
    this.connectAndDownload(payload.ip, payload.port || 8080, this.fileName);
  }

  private connectAndDownload(ip: string, port: number, fileName: string): void {
    const domain = 'olusprogr.dynv6.net';
    const url = `wss://${domain}:${port}`;

    this.socket$ = webSocket({
      url,
      openObserver: {
        next: () => {
          this.status = 'downloading';
          this.socket$!.next({ action: 'file-download', fileName });
        },
      },
    });

    const chunks: Uint8Array[] = [];
    let totalChunks = 0;

    // download-start: Metadaten
    this.socket$.pipe(
      filter((msg: any) => msg.action === 'download-start' && msg.fileName === fileName),
      first(),
      timeout(15_000),
      catchError(() => { this.status = 'error'; this.errorMessage = 'Server antwortet nicht'; this.socket$?.complete(); return of(null); }),
    ).subscribe((msg) => {
      if (!msg) return;
      totalChunks = msg.totalChunks;
      this.fileSize = this.formatSize(msg.fileSize);
    });

    // download-chunk: Chunks sammeln
    const chunkSub = this.socket$.pipe(
      filter((msg: any) => msg.action === 'download-chunk' && msg.fileName === fileName),
    ).subscribe((msg: any) => {
      const binary = atob(msg.data);
      const arr = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) arr[i] = binary.charCodeAt(i);
      chunks[msg.chunkIndex] = arr;
      this.progress = Math.round((msg.chunkIndex + 1) / msg.totalChunks * 100);
    });

    // download-complete / download-error
    this.socket$.pipe(
      filter((msg: any) => (msg.action === 'download-complete' || msg.action === 'download-error') && msg.fileName === fileName),
      first(),
      timeout(6 * 60 * 60_000),
      catchError(() => { this.status = 'error'; this.errorMessage = 'Timeout'; this.socket$?.complete(); return of(null); }),
    ).subscribe((msg) => {
      chunkSub.unsubscribe();
      this.socket$?.complete();
      if (!msg || msg.action === 'download-error') {
        this.status = 'error';
        this.errorMessage = 'Datei konnte nicht geladen werden';
        return;
      }
      const totalBytes = chunks.reduce((s, c) => s + c.length, 0);
      const merged = new Uint8Array(totalBytes);
      let offset = 0;
      for (const chunk of chunks) { merged.set(chunk, offset); offset += chunk.length; }
      const blob = new Blob([merged], { type: 'application/octet-stream' });
      this.triggerDownload(blob, fileName);
      this.status = 'done';
    });
  }

  private triggerDownload(blob: Blob, name: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
  }

  formatSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return (bytes / Math.pow(1024, i)).toFixed(i > 0 ? 1 : 0) + ' ' + units[i];
  }
}
