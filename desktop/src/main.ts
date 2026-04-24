import { app, BrowserWindow, Menu, shell } from "electron";
import { spawn, ChildProcess } from "node:child_process";
import { existsSync } from "node:fs";
import * as path from "node:path";
import * as http from "node:http";

const isDev = !!process.env.WR_DEV_URL;
const BACKEND_PORT = Number(process.env.WR_BACKEND_PORT ?? 4000);
const BACKEND_URL = `http://127.0.0.1:${BACKEND_PORT}`;

let mainWindow: BrowserWindow | null = null;
let backendProcess: ChildProcess | null = null;

function resolveBackendEntry(): string | null {
  const candidates = [
    path.resolve(__dirname, "../../backend/dist/backend/src/server.js"),
    path.resolve(
      process.resourcesPath ?? "",
      "backend/dist/backend/src/server.js",
    ),
  ];
  return candidates.find((p) => existsSync(p)) ?? null;
}

async function waitForBackend(timeoutMs = 15_000): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const ok = await new Promise<boolean>((resolve) => {
      const req = http
        .get(`${BACKEND_URL}/api/health`, (res) => {
          resolve(res.statusCode === 200);
          res.resume();
        })
        .on("error", () => resolve(false));
      req.setTimeout(500, () => {
        req.destroy();
        resolve(false);
      });
    });
    if (ok) return;
    await new Promise((r) => setTimeout(r, 300));
  }
  throw new Error("Backend did not start in time");
}

function startBackend() {
  if (isDev) return;
  const entry = resolveBackendEntry();
  if (!entry) {
    console.warn("Backend entry not found - assuming external server");
    return;
  }
  backendProcess = spawn(process.execPath, [entry], {
    env: {
      ...process.env,
      PORT: String(BACKEND_PORT),
      HOST: "127.0.0.1",
      ELECTRON_RUN_AS_NODE: "1",
    },
    stdio: "inherit",
  });
  backendProcess.on("exit", (code) => {
    console.log(`Backend exited with code ${code}`);
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: "WriteRight",
    backgroundColor: "#f8fafc",
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  const indexPath = path.resolve(__dirname, "../../web/dist/index.html");
  const devUrl = process.env.WR_DEV_URL;
  if (devUrl) {
    mainWindow.loadURL(devUrl);
    mainWindow.webContents.openDevTools({ mode: "detach" });
  } else {
    mainWindow.loadFile(indexPath);
  }

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

async function bootstrap() {
  startBackend();
  try {
    await waitForBackend();
  } catch (err) {
    console.error(err);
  }
  createWindow();
}

if (process.platform === "darwin") {
  Menu.setApplicationMenu(
    Menu.buildFromTemplate([
      {
        label: "WriteRight",
        submenu: [
          { role: "about" },
          { type: "separator" },
          { role: "quit" },
        ],
      },
      { role: "editMenu" },
      { role: "viewMenu" },
      { role: "windowMenu" },
    ]),
  );
}

app.whenReady().then(bootstrap);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

app.on("before-quit", () => {
  backendProcess?.kill();
});
