import { Routes } from '@angular/router';
import { LoginComponent } from './login-component/login-component';
import { LayoutComponent } from './dashboard/layout/layout';
import { DashboardComponent } from './dashboard/dashboard-component/dashboard-component';
import { DeviceComponent } from './dashboard/device-component/device-component';
import { ErrorPage } from './error-page/error-page';
import { Analytics } from './dashboard/analytics/analytics';
import { WsConsole } from './dashboard/ws-console/ws-console';

export const routes: Routes = [
  { path: '', redirectTo: '/login', pathMatch: 'full' },

  { path: 'login', component: LoginComponent, title: 'Login' },

  {
    path: 'dashboard',
    component: LayoutComponent,
    children: [
      {
        path: 'start',
        component: DashboardComponent,
        title: 'Dashboard'
      },
      {
        path: ':dev/:ipv4',
        component: DeviceComponent,
        title: 'Device'
      },
      {
        path: 'analytics',
        component: Analytics,
        title: 'Analytics'
      },
      {
        path: 'server',
        component: WsConsole,
        title: 'WebSocket Konsole'
      }
    ]
  },

  { path: 'error', component: ErrorPage },
  { path: '**', redirectTo: '/error' }
];
