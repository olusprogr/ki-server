import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { ApiService } from '../api-service';
import { FormsModule } from '@angular/forms';
import { environment } from '../../environments/environment';


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
  name: string = "";

  operations = [
    { deviceName: 'Device 1', link: 'dev', status: '', ipv4: ''},
    { deviceName: 'Device 2', link: 'dev', status: '', ipv4: ''},
    { deviceName: 'Device 3', link: 'dev', status: '', ipv4: ''},
    { deviceName: 'Device 4', link: 'dev', status: '', ipv4: ''},
  ];

  constructor(
    private router: Router,
    private apiService: ApiService,
    public route: ActivatedRoute
  ) {
    this.apiService.testAvailableDevicesOnLocalNetwork().subscribe({
      next: (response) => {
        console.log('API-Verbindung erfolgreich');
        console.log(response);
        for (let i = 0; i < response.length; i++) {
          if (response[i].alive === true) {
            this.operations[i].status = "Online";
          } else {
            this.operations[i].status = "Offline";
          }
          if (response[i].ip) {
            this.operations[i].ipv4 = response[i].ip;
          }
        }
      },
      error: (error) => {
        console.error('API-Verbindung fehlgeschlagen:', error);
      },
      complete: () => {
        console.log('API-Verbindungstest abgeschlossen');
        console.log(this.operations);
      }
    });


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
      },
      error: (error) => {
        console.error('API-Verbindung fehlgeschlagen:', error);
      },
      complete: () => {
        console.log('API-Verbindungstest abgeschlossen');
      }
    });
  }

  public navigateToDevice(op: any) {
    this.router.navigate(['/dashboard', op.link, op.ipv4]);
  }
}

