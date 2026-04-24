import { contextBridge } from "electron";

contextBridge.exposeInMainWorld("writeright", {
  platform: process.platform,
  version: process.versions.electron,
});
