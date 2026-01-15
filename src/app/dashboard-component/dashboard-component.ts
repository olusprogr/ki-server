import { CommonModule } from '@angular/common';
import { Component, HostListener } from '@angular/core';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { ApiService } from '../api-service';
import { FormsModule } from '@angular/forms';
import { environment } from '../../environments/environment';
import { UiDevice } from './device.model';


interface Device {
  name: string;
  ip: string;
}

export interface KnownDevicesResponse {
  devices: Device[];
}

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
  availableDevicesInNetwork: number = 0;
  menuOpen: boolean = false;
  isMobile = window.innerWidth < 1024;


  constructor(
    private router: Router,
    private apiService: ApiService,
    public route: ActivatedRoute
  ) {
    this.menuOpen = !this.isMobile;
    
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
        this.availableDevicesInNetwork = this.responses.length;

        this.getKnownDevices();
      }
    })
  }

  private getKnownDevices(): void {
    this.apiService.getKnownDevices().subscribe({
      next: (knownDevices) => {
        const devicesArray = knownDevices.devices;

        for (let device of this.responses) {
          devicesArray.forEach(known => {
            if (device.ip === known.ip) {
              device.name = known.name.toUpperCase();
            }
          })
        }
      }
    })
  }

  public navigateToDevice(op: any) {
    this.router.navigate(['/dashboard', op.name, op.ip]);
  }

  public toggleMenu(): void {
    this.menuOpen = !this.menuOpen;
  }

  @HostListener('window:resize', ['$event'])
  public onResize(event: any) {
    const wasMobile = this.isMobile;
    this.isMobile = event.target.innerWidth < 1024;
    
    if (wasMobile !== this.isMobile) {
      if (!this.isMobile) {
        this.menuOpen = true;
      } 
      else {
        this.menuOpen = false;
      }
    }
  }
}