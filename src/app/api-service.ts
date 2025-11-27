import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class ApiService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {
    console.log(`API Service initialized with URL: ${this.apiUrl}`);
  }

  public testConnection(): Observable<any> {
    return this.http.get(`${this.apiUrl}/test`);
  }

  public logIn(credentials: { username: string; password: string }): Observable<any> {
    return this.http.post(`${this.apiUrl}/login`, credentials);
  }

  public loginWithToken(token: string): Observable<any> {
    const headers = new HttpHeaders({
      Authorization: token
    });

    return this.http.post(`${this.apiUrl}/validate-authToken`, {}, { headers });
  }

  public testAvailableDevicesOnLocalNetwork(): Observable<any> {
    return this.http.get(`${this.apiUrl}/ping-available-devices-in-local-network`);
  }
}
