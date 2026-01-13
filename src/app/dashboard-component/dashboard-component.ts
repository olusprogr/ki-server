import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { ApiService } from '../api-service';
import { FormsModule } from '@angular/forms';
import { environment } from '../../environments/environment';
import { UiDevice } from './device.model';


@Component({
  selector: 'app-dashboard-component',
  imports: [
    CommonModule,
    RouterModule,
    FormsModule
  ],
  templateUrl: './dashboard-component.html',
  styleUrl: './dashboard-component.css',
})
export class DashboardComponent {
  responses: UiDevice[] = [];

  constructor(
    private router: Router,
    private apiService: ApiService,
    public route: ActivatedRoute
  ) {
    this.testAvailableDevicesOnLocalNetwork()

    const authToken = localStorage.getItem('authToken');
    if (!environment.bypassLogin) {
      if (!authToken) {
        this.router.navigate(['/login']);
      }
    }
  }

  public logOut(): void {
    localStorage.removeItem('authToken');
    this.router.navigate(['/login']);
  }

  public testAvailableDevicesOnLocalNetwork(): void {
    this.apiService.testAvailableDevicesOnLocalNetwork().subscribe({
      next: (response) => {
        console.log('API-Verbindung erfolgreich');
        console.log(response);

        this.responses = response.map(device => ({
          time: device.time,
          name: device.name.toUpperCase(),
          alive: device.alive,
          ip: device.ip || "N/A",
        }));
      },
      error: (error) => {
        console.error('API-Verbindung fehlgeschlagen:', error);
      },
      complete: () => {
        console.log('API-Verbindungstest abgeschlossen');
        this.responses = this.responses.filter(dev => dev.alive);
      }
    });
  }

  public navigateToDevice(op: any) {
    this.router.navigate(['/dashboard', op.link, op.ipv4]);
  }
}

