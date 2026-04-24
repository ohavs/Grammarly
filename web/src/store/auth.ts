import { create } from "zustand";
import type { User } from "@writeright/shared";
import { api, setToken } from "../lib/api";

interface AuthState {
  user: User | null;
  loading: boolean;
  initialized: boolean;
  init: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, name: string, password: string) => Promise<void>;
  logout: () => void;
}

export const useAuth = create<AuthState>((set) => ({
  user: null,
  loading: false,
  initialized: false,
  init: async () => {
    try {
      const { user } = await api.me();
      set({ user, initialized: true });
    } catch {
      setToken(null);
      set({ user: null, initialized: true });
    }
  },
  login: async (email, password) => {
    set({ loading: true });
    try {
      const { user, token } = await api.login(email, password);
      setToken(token);
      set({ user });
    } finally {
      set({ loading: false });
    }
  },
  register: async (email, name, password) => {
    set({ loading: true });
    try {
      const { user, token } = await api.register(email, name, password);
      setToken(token);
      set({ user });
    } finally {
      set({ loading: false });
    }
  },
  logout: () => {
    setToken(null);
    set({ user: null });
  },
}));
