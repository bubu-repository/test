/* ==========================================================================
   Framing for close-ups — shared by the camera (Stage) and the panels, so a
   card always appears right beside the object the camera is looking at.
     sheet → the object and a floating card are composed side by side
             (on phones: the object above, the card resting below it)
     stage → the object is centred; the panel rises out of it
   ========================================================================== */
import { FOCUS, PLATE } from './plate';
import { PANEL_LAYOUT, STATIONS, type PanelId, type StationId } from './stations';
import { MAX_SCALE, OVERSCAN, clampCam, fitBox, project, type Area, type Cam } from './camera';

export type Layout = 'sheet' | 'stage' | 'none';
export type Side = 'left' | 'right';

export const isCompact = (vw: number) => vw <= 720;

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

/** Floating card metrics (screen px). `top` keeps clear of the HUD's top row. */
export function cardMetrics(vw: number, vh: number) {
  if (isCompact(vw)) return { w: vw - 20, m: 10, gap: 14, top: 64, maxH: Math.round(vh * 0.6) - 10 };
  const m = Math.round(clamp(vw * 0.03, 24, 48));
  const top = 84;
  // never full height: the card floats with room visible above and below it
  return { w: Math.round(clamp(vw * 0.3, 360, 440)), m, gap: 44, top, maxH: Math.round(Math.min(vh - top - m, vh * 0.8, 720)) };
}

/** Which kind of panel a close-up will show (known before it opens, so the camera flies straight to the final framing). */
export function layoutOf(panel: PanelId | null, pending: PanelId | null, focus: StationId | null): Layout {
  const p = panel ?? pending ?? (focus ? STATIONS[focus].panel ?? null : null);
  return p ? PANEL_LAYOUT[p] : 'none';
}

export interface Frame {
  cam: Cam;
  /** the focus box on screen */
  obj: Area;
  /** floating card position (sheet layout only) */
  card: { x: number; w: number; maxH: number; top: number; bottom: number } | null;
}

export function focusFrame(id: StationId, layout: Layout, side: Side, vw: number, vh: number, open = false): Frame {
  const box = FOCUS[id]!;
  if (layout === 'sheet') {
    const k = cardMetrics(vw, vh);
    if (isCompact(vw)) {
      // the object sits in the band above the card. Objects low in the room can
      // only be lifted that high by zooming in further (the plate edge stops the pan).
      const band = { x: 0, y: 52, w: vw, h: vh - k.maxH - k.m - 52 - k.gap };
      const bx = box.x + box.w / 2;
      const by = box.y + box.h / 2;
      const tx = vw / 2;
      const ty = band.y + band.h / 2;
      const need = 1.02 * Math.max((vh - ty) / (PLATE.h - by), ty / by, (vw - tx) / (PLATE.w - bx), tx / bx);
      const s = Math.min(MAX_SCALE, Math.max(fitBox(box, vw, vh, band, 0.06).s, need));
      const cam = clampCam({ s, x: bx - (tx - vw / 2) / (s * OVERSCAN), y: by - (ty - vh / 2) / (s * OVERSCAN) }, vw, vh);
      return { cam, obj: project(box, cam, vw, vh), card: { x: k.m, w: k.w, maxH: k.maxH, top: vh - k.m - k.maxH, bottom: vh - k.m } };
    }
    const area = { x: side === 'left' ? k.m + k.w + k.gap : k.m, y: k.top, w: vw - k.w - k.gap - 2 * k.m, h: vh - k.top - k.m };
    let cam = fitBox(box, vw, vh, area, 0.1);
    let obj = project(box, cam, vw, vh);
    // compose object + card as one group, centred in the viewport
    const group = obj.w + k.gap + k.w;
    const left = Math.max(k.m, (vw - group) / 2);
    const wantX = side === 'right' ? left : left + k.w + k.gap;
    cam = clampCam({ ...cam, x: cam.x - (wantX - obj.x) / (cam.s * OVERSCAN) }, vw, vh);
    obj = project(box, cam, vw, vh);
    const x = side === 'right' ? obj.x + obj.w + k.gap : obj.x - k.gap - k.w;
    return { cam, obj, card: { x: clamp(x, k.m, vw - k.m - k.w), w: k.w, maxH: k.maxH, top: k.top, bottom: vh - k.m } };
  }
  let cam = fitBox(box, vw, vh, undefined, 0.1);
  // stage panels: lean in a little as the panel rises out of the object
  if (layout === 'stage' && open) cam = clampCam({ ...cam, s: cam.s * 1.1 }, vw, vh);
  return { cam, obj: project(box, cam, vw, vh), card: null };
}

/** The side the card goes: away from the room's edge the object sits near. */
export function sideFor(id: StationId): Side {
  const box = FOCUS[id];
  return box && box.x + box.w / 2 > PLATE.w * 0.55 ? 'left' : 'right';
}
