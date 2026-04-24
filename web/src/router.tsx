import { createBrowserRouter, createHashRouter, Navigate } from "react-router-dom";
import { RootLayout } from "./layouts/RootLayout";
import { DashboardPage } from "./pages/DashboardPage";
import { EditorPage } from "./pages/EditorPage";
import { SettingsPage } from "./pages/SettingsPage";

// hash router works under file:// (Electron packaged) and http (dev)
const factory =
  typeof window !== "undefined" && window.location.protocol === "file:"
    ? createHashRouter
    : createBrowserRouter;

export const router = factory([
  {
    path: "/",
    element: <RootLayout />,
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: "dashboard", element: <DashboardPage /> },
      { path: "documents/:id", element: <EditorPage /> },
      { path: "settings", element: <SettingsPage /> },
    ],
  },
]);
