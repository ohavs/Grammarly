import { useEffect } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../store/auth";

export function ProtectedRoute() {
  const { user, initialized, init } = useAuth();

  useEffect(() => {
    if (!initialized) init();
  }, [initialized, init]);

  if (!initialized) {
    return (
      <div className="flex h-screen items-center justify-center text-slate-500">
        Loading…
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  return <Outlet />;
}
