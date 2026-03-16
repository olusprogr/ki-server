import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../environments/environment';
import { UiDevice } from './dashboard/dashboard-component/device.model';
import { KnownDevicesResponse } from './dashboard/dashboard-component/dashboard-component';

@Injectable({
  providedIn: 'root',
})
export class ApiService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  public testConnection(): Observable<any> {
    return this.http.get(`${this.apiUrl}/test`);
  }

  public logIn(credentials: { username: string; password: string }): Observable<any> {
    return this.http.post(`${this.apiUrl}/login`, credentials);
  }

  public loginWithToken(): Observable<any> {
    return this.http.post(`${this.apiUrl}/validate-authToken`, {});
  }

  public testAvailableDevicesOnLocalNetwork(): Observable<UiDevice[]> {
    return this.http.get<UiDevice[]>(`${this.apiUrl}/ping-available-devices-in-local-network`);
  }

  public sendSSHCommandToDevice(command: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/ssh-tunnel-auth/${encodeURIComponent(command)}`, { command });
  }

  public getKnownDevices(): Observable<KnownDevicesResponse> {
    return this.http.get<KnownDevicesResponse>(`${this.apiUrl}/get-known-devices-in-local-network`);
  }

  public getServerStats(): Observable<ServerStats> {
    return this.http.get<ServerStats>(`${this.apiUrl}/server-stats`);
  }
}

export interface ServerStats {
  cpu: {
    usage: number;
    cores: number;
    model: string;
    loadAvg: number[];
  };
  memory: {
    total: number;
    used: number;
    free: number;
    usagePercent: number;
  };
  uptime: number;
  hostname: string;
  platform: string;
  backgroundTasks: BackgroundTask[];
}

export interface BackgroundTask {
  pid: number;
  name: string;
  cpu: number;
  memory: number;
  status: string;
}