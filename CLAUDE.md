# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm start               # dev server on 0.0.0.0:3001 (serves to local network)
npm run build           # production build → dist/ki-server-new/
npm test                # Karma/Jasmine unit tests
npm run generate-env    # generate src/env.ts from .env (run before build if env vars needed)
npm run deploy          # build + SSH deploy to 192.168.178.211:/var/www/login-page/
npm run watch           # dev build with watch mode
```

Single test: Karma has no CLI filter — use `fdescribe`/`fit` in the spec file to focus a test, then run `npm test`.

Generate scaffolding: `npx ng generate component path/name` (no separate install needed).

## Architecture

**Angular 20 SPA + SSR** with Express (`src/server.ts`). The Express server only serves static files and SSR-renders Angular routes — all real backend calls go to a separate API server.

### Two backend connections

1. **HTTP REST** via `ApiService` (`src/app/api-service.ts`) — uses `environment.apiUrl` (dev: `http://localhost:3003/api`, prod: `/api`). Auth token is attached to every request by `authInterceptor`.

2. **WebSocket** via `WebsocketService` (`src/app/websocket-service.ts`) — connects to `wss://olusprogr.dynv6.net:8080` on startup, falls back to a local IP if provided. Used for chunked file up/download and real-time messages. Upload is serialized through an internal queue; chunks are 1 MB base64-encoded.

### Auth flow

- `authGuard` checks `localStorage.authToken`; redirects to `/login` if absent.
- `environment.bypassLogin = true` in dev skips the guard entirely.
- `authInterceptor` reads the same token and adds it as an `Authorization` header.

### Route structure

```
/login                        LoginComponent
/share/:token                 FileShareComponent   (public, no auth)
/upload/:token                FileUploadComponent  (public, no auth)
/dashboard  (authGuard)
  /start                      DashboardComponent
  /:dev/:ipv4                 DeviceComponent
  /analytics                  Analytics
  /server                     WsConsole
/error                        ErrorPage
** → /error
```

### Environment / secrets

Dev values live in `src/environments/environment.ts`. For builds that need runtime env vars (API keys etc.), run `npm run generate-env` first — it reads a `.env` file and writes `src/env.ts`. Production uses `src/environments/environment.prod.ts` with `apiUrl: '/api'` (reverse-proxied by nginx on the deploy target).

### Styling

Tailwind CSS v4 (PostCSS plugin). Global styles in `src/styles.css`. Prettier is configured with `printWidth: 100`, single quotes, and the Angular HTML parser for templates.
