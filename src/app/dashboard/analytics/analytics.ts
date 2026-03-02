import { Component, OnInit, OnDestroy } from '@angular/core';
import { NgClass, DecimalPipe } from '@angular/common';
import { ApiService, ServerStats } from '../../api-service';
import { Subject, takeUntil, interval, switchMap, startWith, catchError, of } from 'rxjs';

@Component({
  selector: 'app-analytics',
  imports: [NgClass, DecimalPipe],
  templateUrl: './analytics.html',
  styleUrl: './analytics.css',
})
export class Analytics implements OnInit, OnDestroy {
  stats: ServerStats | null = null;
  loading = true;
  error: string | null = null;

  private destroy$ = new Subject<void>();
  private readonly REFRESH_INTERVAL = 2000;

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    interval(this.REFRESH_INTERVAL)
      .pipe(
        startWith(0),
        switchMap(() =>
          this.api.getServerStats().pipe(
            catchError(() => {
              this.error = 'Verbindung zum Server fehlgeschlagen';
              return of(null);
            })
          )
        ),
        takeUntil(this.destroy$)
      )
      .subscribe((data) => {
        this.loading = false;
        if (data) {
          this.stats = data;
          this.error = null;
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  formatUptime(seconds: number): string {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    const parts: string[] = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    parts.push(`${minutes}m`);
    return parts.join(' ');
  }

  formatBytes(bytes: number): string {
    const gb = bytes / (1024 * 1024 * 1024);
    if (gb >= 1) return `${gb.toFixed(1)} GB`;
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(0)} MB`;
  }

  getUsageColor(percent: number): string {
    if (percent < 50) return 'bg-green-500';
    if (percent < 80) return 'bg-amber-500';
    return 'bg-red-500';
  }

  getUsageTextColor(percent: number): string {
    if (percent < 50) return 'text-green-600 dark:text-green-400';
    if (percent < 80) return 'text-amber-600 dark:text-amber-400';
    return 'text-red-600 dark:text-red-400';
  }

  getStatusColor(status: string): string {
    switch (status.toLowerCase()) {
      case 'running':
      case 'sleeping':
        return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      case 'stopped':
        return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      default:
        return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-400';
    }
  }
}
