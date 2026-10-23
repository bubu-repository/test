/* Adelia OS app registry. */
import type { ComponentType } from 'react';
import type { AppId } from './wm';
import About from './apps/About';
import Archive from './apps/Archive';
import Cases from './apps/Cases';
import Terminal from './apps/terminal/Terminal';
import Mail from './apps/Mail';
import Links from './apps/Links';
import Settings from './apps/Settings';
import Trash from './apps/Trash';
import SysInfo from './apps/SysInfo';

export interface AppDef {
  id: AppId;
  title: string; // window title
  label: string; // desktop / dock label
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  C: ComponentType<any>;
  desktop?: boolean;
  dock?: boolean;
  /** graphite window chrome (terminal) */
  dark?: boolean;
  fixed?: boolean; // not resizable
}

/** In desktop / dock order: what a hiring team came for first. */
export const APPS: Record<AppId, AppDef> = {
  cases: { id: 'cases', title: 'Case Files — 4 cases', label: 'Case Files', C: Cases, desktop: true, dock: true },
  mail: { id: 'mail', title: 'New message — to Adelia', label: 'Mail', C: Mail, desktop: true, dock: true },
  terminal: { id: 'terminal', title: 'Terminal — adelia@room', label: 'Terminal', C: Terminal, desktop: true, dock: true, dark: true },
  about: { id: 'about', title: 'About this computer — model card', label: 'Model card', C: About, desktop: true, dock: true },
  archive: { id: 'archive', title: 'Archive — 2022 → 2026', label: 'Archive', C: Archive, desktop: true, dock: true },
  links: { id: 'links', title: 'Links', label: 'Links', C: Links, desktop: true, dock: true },
  settings: { id: 'settings', title: 'Settings', label: 'Settings', C: Settings, desktop: true, dock: true },
  trash: { id: 'trash', title: 'Trash', label: 'Trash', C: Trash, dock: true },
  sysinfo: { id: 'sysinfo', title: 'About Adelia OS', label: 'About Adelia OS', C: SysInfo, fixed: true },
};

export const DESKTOP_APPS = Object.values(APPS).filter((a) => a.desktop);
export const DOCK_APPS = Object.values(APPS).filter((a) => a.dock);
