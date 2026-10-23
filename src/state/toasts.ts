import { create } from 'zustand';

export interface Toast {
  id: number;
  kind: 'achievement' | 'points' | 'info' | 'tier' | 'manifesto';
  title: string;
  body?: string;
  points?: number;
  glyph?: string;
}

interface ToastState {
  toasts: Toast[];
  push: (t: Omit<Toast, 'id'>) => void;
  remove: (id: number) => void;
}

let seq = 1;

export const useToasts = create<ToastState>((set, get) => ({
  toasts: [],
  push: (t) => {
    const id = seq++;
    set({ toasts: [...get().toasts.slice(-3), { ...t, id }] });
    const ttl = t.kind === 'points' ? 2200 : 4800;
    setTimeout(() => get().remove(id), ttl);
  },
  remove: (id) => set({ toasts: get().toasts.filter((t) => t.id !== id) }),
}));

export const toast = (t: Omit<Toast, 'id'>) => useToasts.getState().push(t);
