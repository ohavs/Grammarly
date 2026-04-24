# WriteRight

Offline writing assistant — grammar, spelling, style, clarity and tone
suggestions. Runs entirely inside Electron with no backend, no accounts,
no internet required.

## Structure

```
web/       React + Vite app — includes the grammar engine (retext) + IndexedDB storage
desktop/   Electron wrapper that loads the web build
shared/    TypeScript types shared between the two
```

## Run in development

```bash
npm install
npm run dev
```

This starts the Vite dev server + TypeScript watcher + Electron window
together. Edits to the web app hot-reload; edits to the main process
require restarting.

Prefer the browser only?

```bash
npm run dev:web
```

Then open http://localhost:5173.

## Build an installer

```bash
npm run dist
```

Produces a platform-specific installer in `desktop/release/`:

- macOS → `.dmg`
- Windows → `.exe` (NSIS)
- Linux → `.AppImage`

## How it works

- Grammar engine (`retext` + 12 plugins) runs in the renderer process.
- Hunspell-style dictionary (`dictionary-en`) ships as a static asset
  and is loaded on first check.
- Documents, settings, and the personal dictionary live in IndexedDB,
  scoped to the user's OS profile for the Electron app.
- No server, no auth, no network calls beyond the loaded assets.
