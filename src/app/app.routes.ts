import { Routes } from '@angular/router';
import { LoginComponent } from './login-component/login-component';
import { DashboardComponent } from './dashboard-component/dashboard-component';
import { ErrorPage } from './error-page/error-page';
import { DeviceComponent } from './device-component/device-component';

export const routes: Routes = [
    { path: '', redirectTo: '/login', pathMatch: 'full' },
    { path: 'login', component: LoginComponent, title: 'Login' },
    { path: 'dashboard', component: DashboardComponent, title: 'Dashboard' },
    { path: 'dashboard/:dev/:ipv4', component: DeviceComponent, title: 'Device 1' },
    { path: 'error', component: ErrorPage, title: 'Error' },
    { path: '**', redirectTo: '/error' }
];
