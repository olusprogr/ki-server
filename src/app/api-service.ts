import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class ApiService {
  private apiUrl = 'http://192.168.178.211:3003/api';

  constructor(private http: HttpClient) {}

  public testConnection(): Observable<any> {
    return this.http.get(`${this.apiUrl}/test`);
  }

  public logIn(credentials: { username: string; password: string }): Observable<any> {
    return this.http.post(`${this.apiUrl}/login`, credentials);
  }
}
