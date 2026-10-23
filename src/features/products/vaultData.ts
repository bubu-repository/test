/* ==========================================================================
   The gacha machine (3D vault) — shared state + module copy.
   Turn the crank, a capsule opens, and her flagship product unfolds: the
   Tenderlens pipeline, one stage per module. Every fact is from
   content/projects.ts (Tenderlens → engineering). The module ids are the
   3D model's part ids in Vault3D.tsx (dial, keypad, button, screen, slot),
   so they stay; only the copy changed.
   ========================================================================== */
import { create } from 'zustand';
import { sfx } from '@/audio/engine';
import { track } from '@/lib/api';
import { useUI } from '@/state/ui';

export type ModuleId = 'story' | 'game' | 'convert' | 'insight' | 'launch';

export interface VaultModule {
  id: ModuleId;
  code: string;
  name: string;
  /** one spec line, from the Tenderlens case study */
  spec: string;
  /** one-sentence caption */
  caption: string;
  /** which part of the 3D object it is (UI hint) */
  part: string;
}

/** What the vault is, for its HUD and captions (replaces dside’s PRODUCTS['bubu-world'] lookup:
 *  the Toolkit's PRODUCTS no longer has a 3D product). */
export const VAULT_PRODUCT = {
  id: 'tenderlens',
  model: 'TL-v7',
  name: 'Tenderlens',
  family: 'Tenderlens pipeline · v7',
  tagline: 'The model reads and quotes. Code checks. Rules decide.',
  specs: [
    { k: 'Cost per tender', v: 'Rp 420' },
    { k: 'Overnight batch', v: '41 min p50' },
    { k: 'Monthly bill', v: 'Rp 1.4M for 31 teams' },
  ],
  /** UI strings the panel can use in place of dside's. */
  copy: {
    loader: 'Filling the capsule',
    locked: 'Turn the crank to open the capsule',
    open: 'Four stages and the eval cartridge. Pick one to see what it does.',
    cta: 'Read the Tenderlens case',
  },
  work: 'tenderlens',
} as const;

export const MODULES: VaultModule[] = [
  {
    id: 'story',
    code: 'M1',
    name: 'Crawl and read',
    spec: '14 LPSE portals · 02:00 nightly · OCR on scans',
    caption: 'Every night at 02:00 it polls 14 public procurement portals; new tenders go into a job queue in Postgres, so a crash loses nothing, and scanned pages go through PaddleOCR.',
    part: 'Portal dial',
  },
  {
    id: 'game',
    code: 'M2',
    name: 'Page triage',
    spec: '~200 pages in · ~12 out · small model, Batch API',
    caption: 'A small model labels every page (eligibility, scope, money, addendum or boilerplate) and only about 12 of ~200 go further. Addendum pages always do.',
    part: 'Label keypad',
  },
  {
    id: 'convert',
    code: 'M3',
    name: 'Extract and check',
    spec: 'A quote per field · 99.4% on their page',
    caption: 'A larger model fills a JSON schema with a value, a page and the exact quote. Then code, not a model, checks the quote is on that page, numbers exactly, or the claim is dropped.',
    part: 'The gate button',
  },
  {
    id: 'insight',
    code: 'M4',
    name: 'Verdict rules',
    spec: 'Rules in code · Bid / Check / No / Can’t tell yet',
    caption: 'Rules in TypeScript compare the checked claims with the company profile. A missing, unreadable or conflicting eligibility field means “Can’t tell yet”, never a guess. The brief goes out at 06:30.',
    part: 'Dot-matrix screen',
  },
  {
    id: 'launch',
    code: 'EV',
    name: 'Eval cartridge',
    spec: '610-field thesis set · 180-field regression set in CI',
    caption: 'Every prompt, model or rule change runs against the regression set in CI. Its first run, in April 2026, blocked a release; the fix became v7.',
    part: 'Cartridge slot',
  },
];

export const MODULE_MAP = Object.fromEntries(MODULES.map((m) => [m.id, m])) as Record<ModuleId, VaultModule>;

export type VaultStatus = 'locked' | 'unlocking' | 'open' | 'exploded' | 'closing';

interface VaultState {
  /** key turned + door open requested */
  unlocked: boolean;
  /** modules lifted out */
  exploded: boolean;
  active: ModuleId | null;
  hover: ModuleId | 'key' | null;
  status: VaultStatus;
  ready: boolean;
  /** bump to re-frame the camera */
  viewNonce: number;
  setStatus: (s: VaultStatus) => void;
  setHover: (h: VaultState['hover']) => void;
  setReady: (r: boolean) => void;
  turnKey: () => void;
  closeVault: () => void;
  toggleExploded: () => void;
  select: (id: ModuleId | null) => void;
  resetView: () => void;
  reset: () => void;
}

const flag = (k: string, v: unknown) => useUI.getState().setFlag(k, v);

export const useVault = create<VaultState>((set, get) => ({
  unlocked: false,
  exploded: false,
  active: null,
  hover: null,
  status: 'locked',
  ready: false,
  viewNonce: 0,
  setStatus: (status) => {
    if (get().status === status) return;
    set({ status });
    flag('vaultOpen', status !== 'locked');
  },
  setHover: (hover) => {
    if (get().hover === hover) return;
    set({ hover });
  },
  setReady: (ready) => set({ ready }),
  turnKey: () => {
    if (get().unlocked) {
      get().closeVault();
      return;
    }
    sfx('door-unlock');
    track('vault', { action: 'unlock' });
    set({ unlocked: true, exploded: true });
  },
  closeVault: () => {
    if (!get().unlocked) return;
    sfx('close');
    track('vault', { action: 'close' });
    set({ unlocked: false, exploded: false, active: null });
    flag('vaultModule', null);
  },
  toggleExploded: () => {
    const s = get();
    if (!s.unlocked) {
      s.turnKey();
      return;
    }
    sfx('switch');
    set({ exploded: !s.exploded, active: s.exploded ? null : s.active });
    if (s.exploded) flag('vaultModule', null);
  },
  select: (id) => {
    const s = get();
    if (id === s.active) return;
    if (id) {
      sfx('click');
      track('vault', { action: 'module', id });
      if (!s.unlocked) {
        sfx('door-unlock');
        set({ unlocked: true, exploded: true, active: id });
      } else set({ exploded: true, active: id });
    } else {
      sfx('back');
      set({ active: null });
    }
    flag('vaultModule', id);
  },
  resetView: () => {
    sfx('whoosh', { gain: 0.5 });
    set({ active: null, viewNonce: get().viewNonce + 1 });
    flag('vaultModule', null);
  },
  reset: () => set({ unlocked: false, exploded: false, active: null, hover: null, status: 'locked', ready: false }),
}));
