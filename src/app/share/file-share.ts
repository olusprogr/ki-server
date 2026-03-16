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

    this.socket$
      .pipe(
        filter((msg: any) => msg.action === 'file-download' && msg.fileName === fileName),
        first(),
        timeout(300_000),
        catchError(() => {
          this.status = 'error';
          this.errorMessage = 'Verbindung zum Server fehlgeschlagen';
          this.socket$?.complete();
          return of();
        }),
      )
      .subscribe({
        next: (msg) => {
          if (msg.success && msg.data) {
            this.triggerDownload(msg.data, fileName, msg.fileType);
            this.status = 'done';
          } else {
            this.status = 'error';
            this.errorMessage = 'Datei konnte nicht geladen werden';
          }
          this.socket$?.complete();
        },
        error: () => {
          this.status = 'error';
          this.errorMessage = 'Verbindung zum Server fehlgeschlagen';
        },
      });
  }

  private triggerDownload(base64: string, name: string, mimeType?: string): void {
    const byteChars = atob(base64);
    const byteNumbers = new Array(byteChars.length);
    for (let i = 0; i < byteChars.length; i++) {
      byteNumbers[i] = byteChars.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: mimeType || 'application/octet-stream' });

    this.fileSize = this.formatSize(blob.size);

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  }

  formatSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return (bytes / Math.pow(1024, i)).toFixed(i > 0 ? 1 : 0) + ' ' + units[i];
  }
}
