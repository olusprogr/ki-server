import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { WebSocketSubject, webSocket } from 'rxjs/webSocket';
import { filter, first, timeout as rxTimeout, catchError, of } from 'rxjs';
import { verifyUploadToken } from '../auth/share-token';
import { WebsocketService } from '../websocket-service';

const UPLOAD_PIN = '0909';
const UPLOAD_CHUNK_SIZE = 1 * 1024 * 1024;

export interface UploadEntry {
  name: string;
  size: number;
  status: 'waiting' | 'uploading' | 'done' | 'error';
  progress: number;
  speed: string;
  eta: string;
  errorMsg: string;
}

@Component({
  selector: 'app-file-upload',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './file-upload.html',
})
export class FileUploadComponent implements OnInit, OnDestroy {
  // Step 1: token check
  tokenStatus: 'checking' | 'invalid' | 'expired' | 'ok' = 'checking';

  // Step 2: PIN gate
  pinInput = '';
  pinError = false;
  pinUnlocked = false;

  // Step 3: upload UI
  files: UploadEntry[] = [];
  isDragOver = false;

  private socket$: WebSocketSubject<any> | null = null;
  private uploadQueue: Array<() => void> = [];
  private uploadRunning = false;

  constructor(private route: ActivatedRoute) {}

  ngOnInit(): void {
    const token = this.route.snapshot.paramMap.get('token');
    if (!token) { this.tokenStatus = 'invalid'; return; }
    this.checkToken(token);
  }

  ngOnDestroy(): void {
    this.socket$?.complete();
  }

  private async checkToken(token: string): Promise<void> {
    const payload = await verifyUploadToken(token);
    if (!payload) { this.tokenStatus = 'invalid'; return; }
    // connect socket
    const url = `wss://olusprogr.dynv6.net:${payload.port || 8080}`;
    this.socket$ = webSocket({ url });
    this.socket$.subscribe({ error: () => {} });
    this.tokenStatus = 'ok';
  }

  submitPin(): void {
    if (this.pinInput === UPLOAD_PIN) {
      this.pinUnlocked = true;
      this.pinError = false;
    } else {
      this.pinError = true;
      this.pinInput = '';
    }
  }

  onDragOver(e: DragEvent): void { e.preventDefault(); e.stopPropagation(); this.isDragOver = true; }
  onDragLeave(e: DragEvent): void { e.preventDefault(); e.stopPropagation(); this.isDragOver = false; }

  onDrop(e: DragEvent): void {
    e.preventDefault(); e.stopPropagation();
    this.isDragOver = false;
    const dropped = e.dataTransfer?.files;
    if (!dropped?.length) return;
    for (let i = 0; i < dropped.length; i++) this.addFile(dropped[i]);
  }

  onFileSelect(e: Event): void {
    const input = e.target as HTMLInputElement;
    if (!input.files?.length) return;
    for (let i = 0; i < input.files.length; i++) this.addFile(input.files[i]);
    input.value = '';
  }

  private addFile(file: File): void {
    if (this.files.some(f => f.name === file.name && f.size === file.size)) return;
    const entry: UploadEntry = {
      name: WebsocketService.sanitizeFileName(file.name),
      size: file.size,
      status: 'waiting',
      progress: 0,
      speed: '',
      eta: '',
      errorMsg: '',
    };
    this.files.push(entry);
    this.uploadQueue.push(() => this.executeUpload(file, entry));
    this.drainQueue();
  }

  private drainQueue(): void {
    if (this.uploadRunning || this.uploadQueue.length === 0) return;
    this.uploadRunning = true;
    this.uploadQueue.shift()!();
  }

  private executeUpload(file: File, entry: UploadEntry): void {
    if (!this.socket$) { entry.status = 'error'; entry.errorMsg = 'Keine Verbindung'; this.uploadRunning = false; this.drainQueue(); return; }

    const safeName = entry.name;
    const totalChunks = Math.ceil(file.size / UPLOAD_CHUNK_SIZE);
    entry.status = 'uploading';
    entry.progress = 0;
    const startTime = Date.now();

    const finish = (ok: boolean, msg = '') => {
      entry.status = ok ? 'done' : 'error';
      entry.errorMsg = msg;
      entry.speed = '';
      entry.eta = '';
      this.uploadRunning = false;
      this.drainQueue();
    };

    const startSub = this.socket$!.pipe(
      filter((m: any) => m.action === 'upload-start' && m.fileName === safeName),
      first(), rxTimeout(15_000),
      catchError(() => { finish(false, 'Server hat nicht geantwortet (Timeout 15s)'); return of(null); }),
    ).subscribe((msg: any) => {
      if (!msg) return;
      if (msg.skipped) { finish(true); return; }
      if (!msg.success) { finish(false, msg.reason || 'Server hat Upload abgelehnt'); return; }
      this.sendChunk(file, safeName, 0, totalChunks, entry, startTime, finish);
    });

    const ackSub = this.socket$!.pipe(
      filter((m: any) => m.action === 'upload-chunk-ack' && m.fileName === safeName),
    ).subscribe((msg: any) => {
      const transferred = Math.min((msg.chunkIndex + 1) * UPLOAD_CHUNK_SIZE, file.size);
      entry.progress = Math.round(transferred / file.size * 100);
      const elapsed = (Date.now() - startTime) / 1000;
      if (elapsed > 0 && transferred > 0) {
        const bps = transferred / elapsed;
        const etaSec = (file.size - transferred) / bps;
        entry.speed = this.formatSize(Math.round(bps)) + '/s';
        entry.eta = etaSec < 60 ? Math.round(etaSec) + 's' : Math.round(etaSec / 60) + 'min ' + Math.round(etaSec % 60) + 's';
      }
    });

    this.socket$!.pipe(
      filter((m: any) => (m.action === 'upload-complete' || m.action === 'upload-error') && m.fileName === safeName),
      first(), rxTimeout(6 * 60 * 60_000),
      catchError(() => { startSub.unsubscribe(); ackSub.unsubscribe(); finish(false, 'Timeout'); return of(null); }),
    ).subscribe((msg: any) => {
      startSub.unsubscribe(); ackSub.unsubscribe();
      if (!msg) return;
      finish(msg.action === 'upload-complete' && msg.success === true, msg.reason);
    });

    this.socket$!.next({ action: 'upload-start', fileName: safeName, totalChunks, fileSize: file.size });
  }

  private sendChunk(file: File, safeName: string, idx: number, total: number, entry: UploadEntry, startTime: number, finish: (ok: boolean, msg?: string) => void): void {
    if (idx >= total) return;
    const start = idx * UPLOAD_CHUNK_SIZE;
    const slice = file.slice(start, Math.min(start + UPLOAD_CHUNK_SIZE, file.size));
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(',')[1];
      this.socket$!.next({ action: 'upload-chunk', fileName: safeName, chunkIndex: idx, data: base64 });
      if (idx + 1 < total) this.sendChunk(file, safeName, idx + 1, total, entry, startTime, finish);
    };
    reader.onerror = () => finish(false, 'Datei konnte nicht gelesen werden');
    reader.readAsDataURL(slice);
  }

  formatSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return (bytes / Math.pow(1024, i)).toFixed(i > 0 ? 1 : 0) + ' ' + units[i];
  }
}
