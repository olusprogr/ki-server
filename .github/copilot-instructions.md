# Copilot Instructions for ki-server-angular

## Project Overview
Angular 20 application for device management dashboard with WebSocket-based device communication. Backend API connects to local network devices. Uses standalone components (no NgModules).

## Architecture

### Environment Configuration Pattern
- **Critical**: `src/generate-env.js` generates `src/env.ts` from `.env` file at build/serve time
- `src/environments/environment.ts` (dev) and `environment.prod.ts` (prod) define runtime config
- `environment.apiUrl` switches between `http://localhost:3003/api` (dev) and `/api` (prod)
- Always run `npm run generate-env` before building/serving (already in npm scripts)
- Generated `env.ts` contains: `API_KEY`, `VAR_A`, `VAR_B` from `.env` file

### Component Structure
All components use standalone pattern with explicit imports:
```typescript
@Component({
  selector: 'app-component-name',
  imports: [CommonModule, FormsModule, RouterModule], // explicit imports
  templateUrl: './component.html',
  styleUrl: './component.css'
})
```

### Service Layer
- **ApiService** (`src/app/api-service.ts`): REST API communication with backend
  - `/test` - connection test
  - `/login` - username/password auth
  - `/validate-authToken` - token validation
  - `/ping-available-devices-in-local-network` - device discovery
- **WebsocketService** (`src/app/websocket-service.ts`): Real-time device communication
  - Hardcoded to `ws://localhost:8080`
  - Uses RxJS `webSocket` from `rxjs/webSocket`
  - Pattern: `sendMessage()` and `getMessages()` observable

### Routing & Navigation
Routes defined in `src/app/app.routes.ts`:
- `/login` → LoginComponent (default)
- `/dashboard` → DashboardComponent (requires authToken in localStorage)
- `/dashboard/:dev/:ipv4` → DeviceComponent (WebSocket connection)
- `/error` → ErrorPage (fallback)

### Authentication Flow
1. LoginComponent checks `localStorage.getItem('authToken')` on init
2. If token exists, calls `ApiService.loginWithToken()`
3. On success, navigates to `/dashboard`
4. Manual login stores token: `localStorage.setItem('authToken', response.token)`
5. DashboardComponent redirects to login if no token

## Development Workflow

### Starting Development
```bash
npm start  # Runs generate-env + ng serve on 0.0.0.0:3001
```
Configured for external access on `ms-router.dynv6.net` in `angular.json`.

### Building for Production
```bash
npm run build  # Generates to dist/ki-server-new/
```

### Deployment Pattern (from README)
```bash
ng build
ssh root@192.168.178.211 "rm -rf /var/www/login-page/*"
scp -r dist/ki-server-new/* root@192.168.178.211:/var/www/login-page/
```

### Testing
```bash
npm test  # Karma + Jasmine test runner
```

## Code Conventions

### File Naming
- Components: `component-name/component-name.ts` (not `component-name.component.ts`)
- Services: `service-name.ts` (not `service-name.service.ts`)
- Lowercase with hyphens for directories and files

### TypeScript Configuration
- Strict mode enabled in `tsconfig.json`
- `experimentalDecorators: true` for Angular decorators
- Target: ES2022

### Prettier Settings
From `package.json`:
- `printWidth: 100`
- `singleQuote: true`
- Angular HTML parser for `.html` files

## Key Integration Points

### Backend API Dependency
App expects backend server at `http://localhost:3003/api` (dev) providing:
- User authentication endpoints
- Device discovery via network ping
- WebSocket server at `ws://localhost:8080` for device communication

### Device Discovery Flow
DashboardComponent calls `testAvailableDevicesOnLocalNetwork()` on init:
- Returns array with `{alive: boolean, ip: string}` for each device
- Updates `operations` array status to "Online"/"Offline"
- Stores IP for navigation to DeviceComponent

### WebSocket Communication Pattern
DeviceComponent establishes persistent connection:
- Subscribe to `websocketService.getMessages()` on init
- Send messages via `websocketService.sendMessage({message: string})`
- Local message log with `type: 'sent' | 'received' | 'system'`

## Common Tasks

### Adding New Component
Use standalone pattern with explicit imports:
```typescript
import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';

@Component({
  selector: 'app-new-component',
  imports: [CommonModule], // add all needed imports
  templateUrl: './new-component.html',
  styleUrl: './new-component.css'
})
export class NewComponent { }
```

### Adding Environment Variables
1. Add to `.env` file (root)
2. Update `src/generate-env.js` to include new variable
3. Rebuild - `npm run generate-env` or restart dev server

### Modifying API Endpoints
Update `ApiService` methods in `src/app/api-service.ts` - all use `${this.apiUrl}` prefix from environment.
