import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../api-service';
import { WebsocketService } from '../../websocket-service';
import { UiDevice } from '../dashboard-component/device.model';
import { createShareToken } from '../../auth/share-token';

// Datei-Objekt fuer die UI-Liste
export interface ServerFile {
  name: string;
  size: number;
  type: string;
  addedAt: Date;
  status: 'uploading' | 'done' | 'error' | 'deleting' | 'downloading' | 'server';
  // 'server'   = bereits auf dem Server vorhanden (aus list-Response)
  // 'uploading' = wird gerade hochgeladen
  // 'done'      = Upload erfolgreich bestaetigt vom Server
  // 'error'     = Upload fehlgeschlagen
  // 'deleting'  = Loeschung laeuft
}

@Component({
  selector: 'app-ws-console',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './ws-console.html',
})
export class WsConsole implements OnInit, OnDestroy {

  // --- State: Geraeteauswahl (Step 1) ---
  devices: UiDevice[] = [];
  loadingDevices = true;
  loadingFiles = false;
  deviceError = '';
  selectedDevice: UiDevice | null = null;
  checking = false;        // true waehrend WSS-Verbindungstest laeuft
  connectionOk = false;    // true = WSS erreichbar -> Datei-UI freigeschalten

  // --- State: Dateiverwaltung (Step 2, erst nach connectionOk) ---
  files: ServerFile[] = [];
  isDragOver = false;
  copiedIndex: number | null = null;

  constructor(
    private apiService: ApiService,
    private wsService: WebsocketService,
  ) {}

  // Beim Laden der Seite: erreichbare Geraete holen
  ngOnInit(): void {
    this.loadDevices();
  }

  // Beim Verlassen der Seite: offene WSS-Verbindung schliessen
  ngOnDestroy(): void {
    if (this.connectionOk) {
      this.wsService.closeConnection();
    }
  }

  // ==================== STEP 1: Geraete laden ====================

  // Holt alle erreichbaren Geraete ueber die REST-API,
  // dann werden bekannte Geraete-Namen zugeordnet
  private loadDevices(): void {
    this.loadingDevices = true;
    this.deviceError = '';

    this.apiService.testAvailableDevicesOnLocalNetwork().subscribe({
      next: (response) => {
        // Nur lebende Geraete behalten
        this.devices = response
          .filter((d) => d.alive)
          .map((d) => ({
            time: d.time,
            name: d.name.toUpperCase(),
            alive: d.alive,
            ip: d.ip || 'N/A',
          }));

        // Bekannte Namen zuordnen (z.B. "RASPBERRY PI" statt IP)
        this.apiService.getKnownDevices().subscribe({
          next: (known) => {
            for (const device of this.devices) {
              const match = known.devices.find((k) => k.ip === device.ip);
              if (match) device.name = match.name.toUpperCase();
            }
            this.loadingDevices = false;
          },
          error: () => {
            this.loadingDevices = false;
          },
        });
      },
      error: () => {
        this.deviceError = 'Geräte konnten nicht geladen werden';
        this.loadingDevices = false;
      },
    });
  }

  // ==================== STEP 1 -> 2: WSS-Verbindung pruefen ====================

  // User klickt auf ein Geraet -> echte WebSocket-Verbindung wird getestet.
  // Nur wenn ws://{device.ip}:8080 antwortet, wird connectionOk = true,
  // dann werden die bestehenden Dateien vom Server geladen.
  selectDevice(device: UiDevice): void {
    this.selectedDevice = device;
    this.checking = true;
    this.connectionOk = false;
    this.deviceError = '';

    this.wsService.tryConnect(device.ip).subscribe((ok) => {
      this.checking = false;
      if (ok) {
        this.connectionOk = true;
        // Bestehende Dateien vom Server laden
        this.loadServerFiles();
      } else {
        this.connectionOk = false;
        this.deviceError = `WebSocket-Verbindung zu ${device.name} (${device.ip}) fehlgeschlagen`;
        this.selectedDevice = null;
      }
    });
  }

  // Zurueck zur Geraeteauswahl, WSS-Verbindung trennen
  resetDevice(): void {
    this.wsService.closeConnection();
    this.selectedDevice = null;
    this.connectionOk = false;
    this.files = [];
  }

  // ==================== STEP 2: Dateien vom Server laden ====================

  // Fragt den WSS-Server nach der Dateiliste (action: 'file-list')
  // und befuellt die lokale Liste mit den bereits vorhandenen Dateien
  // Oeffentlich fuer den Refresh-Button im Template
  refreshFiles(): void {
    this.loadServerFiles();
  }

  private loadServerFiles(): void {
    this.loadingFiles = true;

    this.wsService.listFiles().subscribe((entries) => {
      this.files = entries.map((e) => ({
        name: e.name,
        size: e.size,
        type: this.guessType(e.name),
        addedAt: new Date(),
        status: 'server' as const,
      }));
      this.loadingFiles = false;
    });
  }

  // MIME-Type aus Dateiendung ableiten (fuer Server-Dateien ohne MIME-Info)
  private guessType(name: string): string {
    const ext = name.split('.').pop()?.toLowerCase() || '';
    const map: Record<string, string> = {
      jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif',
      svg: 'image/svg+xml', webp: 'image/webp',
      mp4: 'video/mp4', webm: 'video/webm', avi: 'video/x-msvideo',
      mp3: 'audio/mpeg', wav: 'audio/wav', ogg: 'audio/ogg',
      pdf: 'application/pdf',
      zip: 'application/zip', tar: 'application/x-tar', gz: 'application/gzip',
      rar: 'application/vnd.rar',
      json: 'application/json', xml: 'application/xml',
      js: 'text/javascript', ts: 'text/typescript',
      txt: 'text/plain', csv: 'text/csv', html: 'text/html', css: 'text/css',
    };
    return map[ext] || 'application/octet-stream';
  }

  // ==================== STEP 2: Drag & Drop + Upload ====================

  // Drag-Events: visuelles Feedback beim Ueberfahren der Drop-Zone
  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = true;
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = false;
  }

  // Dateien wurden in die Drop-Zone fallen gelassen -> hochladen ueber WSS
  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = false;

    const droppedFiles = event.dataTransfer?.files;
    if (!droppedFiles?.length) return;

    for (let i = 0; i < droppedFiles.length; i++) {
      const file = droppedFiles[i];
      // Duplikate vermeiden (gleicher Name + gleiche Groesse)
      if (!this.files.some((f) => f.name === file.name && f.size === file.size)) {
        this.addAndUploadFile(file);
      }
    }
  }

  // Dateien ueber den nativen File-Picker ausgewaehlt -> hochladen ueber WSS
  onFileSelect(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;

    for (let i = 0; i < input.files.length; i++) {
      const file = input.files[i];
      if (!this.files.some((f) => f.name === file.name && f.size === file.size)) {
        this.addAndUploadFile(file);
      }
    }

    input.value = '';
  }

  // Datei zur Liste hinzufuegen und ueber den WebSocket an den Server senden.
  // Wartet auf die Server-Antwort fuer den tatsaechlichen Status (done/error).
  private addAndUploadFile(file: File): void {
    const entry: ServerFile = {
      name: file.name,
      size: file.size,
      type: file.type || 'unknown',
      addedAt: new Date(),
      status: 'uploading',
    };
    this.files.push(entry);

    // Datei als Base64 ueber WSS senden, Server antwortet mit success: true/false
    this.wsService.sendFile(file).subscribe((ok) => {
      entry.status = ok ? 'done' : 'error';
    });
  }

  // ==================== Datei loeschen ====================

  // Datei vom Server loeschen (type: 'delete') und aus der lokalen Liste entfernen
  removeFile(index: number): void {
    const file = this.files[index];
    if (!file) return;

    // Wenn die Datei auf dem Server liegt oder erfolgreich hochgeladen wurde:
    // Loesch-Request an den Server senden
    if (file.status === 'server' || file.status === 'done') {
      file.status = 'deleting';
      this.wsService.deleteFile(file.name).subscribe((ok) => {
        if (ok) {
          // Aus der lokalen Liste entfernen
          const idx = this.files.indexOf(file);
          if (idx !== -1) this.files.splice(idx, 1);
        } else {
          // Fehler -> zurueck auf vorherigen Status
          file.status = 'error';
        }
      });
    } else {
      // Datei war nur lokal (upload fehlgeschlagen etc.) -> direkt entfernen
      this.files.splice(index, 1);
    }
  }

  // ==================== Datei herunterladen ====================

  // Datei vom Server herunterladen und als Browser-Download bereitstellen
  downloadFile(index: number): void {
    const file = this.files[index];
    if (!file || file.status === 'downloading') return;

    const prevStatus = file.status;
    file.status = 'downloading';

    this.wsService.downloadFile(file.name).subscribe((res) => {
      if (res.success && res.data) {
        // Base64-Daten in einen Blob umwandeln und Download ausloesen
        const byteChars = atob(res.data);
        const byteNumbers = new Array(byteChars.length);
        for (let i = 0; i < byteChars.length; i++) {
          byteNumbers[i] = byteChars.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: file.type || 'application/octet-stream' });

        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = file.name;
        a.click();
        URL.revokeObjectURL(url);

        file.status = prevStatus;
      } else {
        file.status = 'error';
      }
    });
  }

  // ==================== Datei teilen ====================

  // Generiert einen oeffentlichen Share-Link fuer die Datei und kopiert ihn in die Zwischenablage.
  // Der Link fuehrt zu /share/:token, wo der Token die Geraete-IP und den Dateinamen enthaelt.
  async shareFile(index: number): Promise<void> {
    const file = this.files[index];
    if (!file || !this.selectedDevice) return;

    // Dateien > 1 GB: 20 Minuten, sonst 5 Minuten
    const ttlMs = file.size > 1_073_741_824 ? 20 * 60_000 : 5 * 60_000;
    const payload = {
      ip: 'olusprogr.dynv6.net',
      port: 8080,
      fileName: file.name,
      expiresAt: Date.now() + ttlMs,
    };
    const token = await createShareToken(payload);
    const link = `${window.location.origin}/share/${token}`;

    const copied = await navigator.clipboard.writeText(link).then(() => true).catch(() => false);

    if (!copied) {
      const ta = document.createElement('textarea');
      ta.value = link;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }

    this.copiedIndex = index;
    setTimeout(() => {
      if (this.copiedIndex === index) this.copiedIndex = null;
    }, 2000);
  }

  // ==================== Hilfsfunktionen ====================

  // Bytes in lesbares Format umwandeln (z.B. 1024 -> "1.0 KB")
  formatSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return (bytes / Math.pow(1024, i)).toFixed(i > 0 ? 1 : 0) + ' ' + units[i];
  }

  // MIME-Type -> Icon-Kategorie fuer die Tabelle
  getFileIcon(type: string): string {
    if (type.startsWith('image/')) return 'image';
    if (type.startsWith('video/')) return 'video';
    if (type.startsWith('audio/')) return 'audio';
    if (type.includes('pdf')) return 'pdf';
    if (type.includes('zip') || type.includes('tar') || type.includes('rar')) return 'archive';
    if (type.includes('json') || type.includes('xml') || type.includes('javascript') || type.includes('typescript')) return 'code';
    if (type.includes('text')) return 'text';
    return 'file';
  }

  // Gesamtgroesse aller Dateien in der Liste
  get totalSize(): number {
    return this.files.reduce((sum, f) => sum + f.size, 0);
  }
}
