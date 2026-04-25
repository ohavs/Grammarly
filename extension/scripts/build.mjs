import { build } from "vite";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  cpSync,
  rmSync,
  mkdirSync,
  existsSync,
  readFileSync,
  writeFileSync,
} from "node:fs";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");
const outDir = resolve(root, "dist");
const watch = process.argv.includes("--watch");
const isDev = watch || process.env.NODE_ENV === "development";

if (!watch) {
  rmSync(outDir, { recursive: true, force: true });
}
mkdirSync(outDir, { recursive: true });

const sharedConfig = {
  root,
  mode: isDev ? "development" : "production",
  configFile: false,
  logLevel: "info",
  define: {
    "process.env.NODE_ENV": JSON.stringify(
      isDev ? "development" : "production",
    ),
  },
  resolve: {
    alias: {
      react: "preact/compat",
      "react-dom": "preact/compat",
      "react/jsx-runtime": "preact/jsx-runtime",
    },
  },
  esbuild: {
    jsx: "automatic",
    jsxImportSource: "preact",
  },
};

const entries = [
  {
    name: "content",
    entry: "src/content/index.ts",
    format: "iife",
    cssOut: "content.css",
  },
  {
    name: "background",
    entry: "src/background/index.ts",
    format: "es",
  },
  {
    name: "popup",
    entry: "src/popup/index.tsx",
    format: "iife",
    cssOut: "popup.css",
  },
];

function configFor(entry) {
  return {
    ...sharedConfig,
    build: {
      outDir,
      emptyOutDir: false,
      sourcemap: isDev,
      minify: !isDev,
      cssCodeSplit: false,
      lib: {
        entry: resolve(root, entry.entry),
        name: `WR_${entry.name}`,
        formats: [entry.format],
        fileName: () => `${entry.name}.js`,
      },
      rollupOptions: {
        output: {
          assetFileNames: (info) => {
            const name = info.name || "";
            if (name.endsWith(".css") && entry.cssOut) return entry.cssOut;
            return "assets/[name].[ext]";
          },
        },
      },
      watch: watch ? {} : null,
    },
  };
}

async function buildEntry(entry) {
  console.log(`[build] ${entry.name} (${entry.format})`);
  await build(configFor(entry));
}

function copyStatic() {
  const publicDir = resolve(root, "public");
  if (!existsSync(publicDir)) return;
  cpSync(publicDir, outDir, { recursive: true });

  const manifestPath = resolve(outDir, "manifest.json");
  if (existsSync(manifestPath)) {
    const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
    if (isDev) {
      manifest.name = `${manifest.name} (dev)`;
    }
    writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  }
  console.log("[build] copied static assets to dist/");
}

if (watch) {
  copyStatic();
  for (const entry of entries) {
    buildEntry(entry).catch((err) => {
      console.error(`[build] ${entry.name} failed:`, err);
    });
  }
} else {
  for (const entry of entries) {
    await buildEntry(entry);
  }
  copyStatic();
  console.log(`[build] complete → ${outDir}`);
}
