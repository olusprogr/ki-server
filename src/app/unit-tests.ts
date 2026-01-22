import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { ApiService } from './api-service';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class UnitTests {
  bypassLogin: boolean = environment.bypassLogin || false;

  constructor(
    private router: Router,
    private apiService: ApiService
  ) {
    if (this.bypassLogin) {
      console.log('UnitTests Service initialized');
      this.testConnection().subscribe();
    }
  }

  private testConnection(): Observable<boolean> {
    return this.apiService.testConnection().pipe(
      map(response => {
        console.log('API-Verbindung erfolgreich');
        console.log(response);
        return true;
      }),
      catchError(error => {
        console.error('API-Verbindung fehlgeschlagen:', error);
        return of(false);
      })
    );
  }
}
