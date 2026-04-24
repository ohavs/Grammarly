# WriteRight

Real-time writing assistant: grammar, spelling, style, clarity, and tone
suggestions. Built as a monorepo with a shared backend powering a web app,
a desktop app (Electron), a browser extension, and a mobile app.

## Status

- Web + Desktop: complete (see `web/` and `desktop/`)
- Browser extension: next
- Mobile app: planned

## Structure

```
backend/   Fastify + SQLite + retext grammar engine
web/       React + Vite + Tailwind client
desktop/   Electron wrapper that spawns the backend locally
shared/    TypeScript types shared between backend and clients
```

## Prerequisites

- Node.js 22+
- npm 10+

## Getting started

```bash
npm install
```

### Run the backend (port 4000)

```bash
npm run dev -w @writeright/backend
```

### Run the web client (port 5173, proxies /api → backend)

```bash
npm run dev -w @writeright/web
```

Open http://localhost:5173, register a user, and start writing.

### Run the desktop app (dev)

Requires the backend to be running separately, or use the wrapper:

```bash
npm run build -w @writeright/backend
npm run build -w @writeright/web
npm run build:main -w @writeright/desktop
npm start -w @writeright/desktop
```

### Build distributables

```bash
npm run dist -w @writeright/desktop
```

Outputs `.dmg` / `.exe` / `.AppImage` to `desktop/release/`.

## Backend API

All endpoints are prefixed with `/api`. Protected endpoints require
`Authorization: Bearer <JWT>`.

| Method | Path                   | Auth | Purpose                   |
| ------ | ---------------------- | ---- | ------------------------- |
| GET    | `/health`              |      | Server health             |
| POST   | `/auth/register`       |      | Create user + token       |
| POST   | `/auth/login`          |      | Exchange creds for token  |
| GET    | `/auth/me`             | ✓    | Current user              |
| POST   | `/check`               |      | Grammar/style issues      |
| POST   | `/stats`               |      | Readability metrics       |
| POST   | `/tone`                |      | Tone detection            |
| GET    | `/synonyms/:word`      |      | Synonyms from thesaurus   |
| GET    | `/documents`           | ✓    | List user documents       |
| POST   | `/documents`           | ✓    | Create document           |
| GET    | `/documents/:id`       | ✓    | Get document              |
| PATCH  | `/documents/:id`       | ✓    | Update title/content      |
| DELETE | `/documents/:id`       | ✓    | Delete document           |
| GET    | `/settings`            | ✓    | User preferences          |
| PUT    | `/settings`            | ✓    | Update preferences        |
| GET    | `/dictionary`          | ✓    | Personal word list        |
| POST   | `/dictionary`          | ✓    | Add word                  |
| DELETE | `/dictionary/:word`    | ✓    | Remove word               |

## Tests

```bash
npm test -w @writeright/backend
```

## Deploy the backend

```bash
docker build -f backend/Dockerfile -t writeright-backend .
docker run -p 4000:4000 -v writeright-data:/data writeright-backend
```

Set `JWT_SECRET` in production. The SQLite DB lives at
`/data/writeright.db` inside the container.
