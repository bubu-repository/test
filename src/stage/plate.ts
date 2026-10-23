/* ==========================================================================
   The room plate — a single 6336×2688 photoreal render of the studio.
   Every coordinate below is in plate pixels (origin top-left).
   ========================================================================== */
import type { StationId } from './stations';

export const PLATE = {
  w: 6336,
  h: 2688,
  widths: [1600, 2560, 3840, 6336] as const,
  url: (w: number) => `/assets/room/room-${w}.webp`,
};

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Interactive regions. `cut` = transparent cut-out of the object (exact
 *  silhouette) used for the hover lift; `rect` = flat objects (posters, boards). */
export interface Hit extends Box {
  id: string;
  station: StationId;
  kind: 'cut' | 'rect';
  /** extra panel props when this specific part is clicked */
  props?: Record<string, unknown>;
  label?: string; // overrides station name in the cursor label
  z?: number;
}

const cut = (id: string, station: StationId, x: number, y: number, w: number, h: number, extra: Partial<Hit> = {}): Hit => ({ id, station, kind: 'cut', x, y, w, h, ...extra });
const rect = (id: string, station: StationId, x: number, y: number, w: number, h: number, extra: Partial<Hit> = {}): Hit => ({ id, station, kind: 'rect', x, y, w, h, ...extra });

export const HITS: Hit[] = [
  // I · the toolkit shelf (each object = one capability) + the gacha machine (3D)
  cut('cassette', 'shelf', 418, 520, 330, 220, { props: { focus: 'field-research' } }),
  cut('cd', 'shelf', 924, 480, 286, 252, { props: { focus: 'retrieval' } }),
  cut('jar', 'shelf', 504, 894, 202, 292, { props: { focus: 'evals' } }),
  cut('robot', 'shelf', 968, 870, 178, 316, { props: { focus: 'agents' } }),
  cut('zines', 'shelf', 404, 1490, 462, 150, { props: { focus: 'design' } }),
  cut('usb', 'shelf', 1008, 1378, 172, 252, { props: { focus: 'full-stack' } }),
  cut('gacha', 'vault', 640, 1744, 400, 642),

  // II · the wall of work, the clock, her ID, the camera + pass, the printer, paper, mug, binder
  rect('poster1', 'gallery', 1597, 335, 455, 680, { props: { work: 'tenderlens' } }),
  rect('poster2', 'gallery', 2128, 335, 455, 680, { props: { work: 'ask-hr' } }),
  rect('poster3', 'gallery', 2664, 335, 455, 680, { props: { work: 'catat' } }),
  rect('poster4', 'gallery', 3198, 335, 458, 680, { props: { work: 'lintas' } }),
  cut('clock', 'clock', 1662, 1094, 310, 308),
  cut('lanyard', 'about', 2080, 1108, 108, 470),
  cut('camera', 'studio', 2412, 1124, 190, 176),
  cut('card', 'pass', 2604, 1196, 132, 102),
  cut('printer', 'printer', 1674, 1516, 224, 234),
  cut('newspaper', 'news', 1936, 1676, 462, 114),
  cut('mug', 'quiz', 2356, 1590, 164, 152),
  cut('binder', 'book', 2544, 1642, 328, 136),

  // III · the computer and today's pack
  cut('monitor', 'computer', 2918, 1230, 490, 500),
  cut('keyboard', 'computer', 2904, 1724, 518, 74, { z: 2 }),
  cut('mouse', 'computer', 3478, 1740, 90, 56, { z: 2 }),
  cut('pack', 'pack', 3494, 1434, 188, 296),

  // IV · the gingham board, the LED, the desk toys and Moci
  rect('board', 'badges', 3772, 376, 880, 636),
  cut('led', 'launch', 3776, 1072, 874, 116),
  cut('handheld', 'console', 3812, 1396, 376, 218),
  cut('synth', 'synth', 3728, 1636, 574, 150, { z: 1 }),
  cut('phone', 'phone', 4296, 1392, 142, 330),
  cut('moci', 'moci', 4456, 1536, 220, 218),

  // V · the window, the aquarium, the record player, the big button
  rect('window', 'window', 4880, 110, 1430, 1480, { z: -1 }),
  cut('aquarium', 'sea', 5392, 1468, 370, 432),
  cut('turntable', 'record', 5374, 1950, 420, 178),
  rect('button', 'button', 4830, 1950, 410, 580),
];

/** Camera framing per station (close-up). */
export const FOCUS: Partial<Record<StationId, Box>> = {
  shelf: { x: 160, y: 440, w: 1320, h: 2120 },
  vault: { x: 520, y: 1640, w: 640, h: 860 },
  gallery: { x: 1540, y: 280, w: 2180, h: 800 },
  clock: { x: 1580, y: 1010, w: 470, h: 470 },
  about: { x: 1960, y: 1060, w: 350, h: 560 },
  studio: { x: 2300, y: 1030, w: 420, h: 360 },
  pass: { x: 2520, y: 1130, w: 300, h: 240 },
  printer: { x: 1570, y: 1420, w: 430, h: 430 },
  news: { x: 1820, y: 1480, w: 700, h: 420 },
  quiz: { x: 2240, y: 1470, w: 400, h: 340 },
  book: { x: 2460, y: 1520, w: 500, h: 340 },
  computer: { x: 2780, y: 1150, w: 760, h: 720 },
  pack: { x: 3410, y: 1380, w: 360, h: 400 },
  badges: { x: 3700, y: 310, w: 1020, h: 760 },
  launch: { x: 3700, y: 980, w: 1020, h: 300 },
  console: { x: 3740, y: 1330, w: 520, h: 350 },
  synth: { x: 3650, y: 1540, w: 730, h: 320 },
  phone: { x: 4200, y: 1340, w: 340, h: 430 },
  moci: { x: 4380, y: 1470, w: 370, h: 330 },
  window: { x: 4840, y: 60, w: 1500, h: 1600 },
  sea: { x: 5280, y: 1380, w: 600, h: 600 },
  record: { x: 5280, y: 1820, w: 610, h: 420 },
  button: { x: 4700, y: 1850, w: 660, h: 760 },
};

/** Story stops (left → right) matching VIEWPOINTS order in stations.ts. */
export const VIEW_BOXES: Box[] = [
  { x: 0, y: 0, w: 6336, h: 2688 }, // overview
  { x: 120, y: 380, w: 1440, h: 2240 }, // I toolkit — the shelf
  { x: 1500, y: 260, w: 1560, h: 1620 }, // II proof — posters, clock, ID, camera, desk left
  { x: 2700, y: 1050, w: 1150, h: 850 }, // III build — the computer, today's pack
  { x: 3680, y: 300, w: 1100, h: 1560 }, // IV play — board, LED, handheld, synth, phone, Moci
  { x: 4740, y: 60, w: 1596, h: 2620 }, // V hello — window, aquarium, record, button
];

/** Where the camera rests after walking in (desk centre, slightly zoomed). */
export const ENTRY_BOX: Box = { x: 1500, y: 420, w: 3400, h: 1700 };

/* ---------------- live overlay anchors ---------------- */
export const LIVE = {
  clock: { cx: 1817, cy: 1248, hour: 64, minute: 96, second: 106 },
  led: { x: 3790, y: 1084, w: 846, h: 90 },
  screen: { x: 2980, y: 1298, w: 368, h: 298 },
  handheld: { x: 3930, y: 1452, w: 142, h: 100 },
  window: { x: 5000, y: 330, w: 1160, h: 1180, mask: '/assets/room/window-mask.png' },
  felt: { x: 3810, y: 410, w: 800, h: 560 },
  vinyl: { cx: 5543, cy: 2000, rx: 150, ry: 20 },
  printerSlot: { x: 1719, y: 1606, w: 127 },
  mugSteam: { x: 2457, y: 1598 },
  tank: { x: 5418, y: 1540, w: 318, h: 300 },
  idCard: { x: 2094, y: 1452, w: 82, h: 112 },
  /** the room has no ceiling tubes: the "lights on" beat brightens the window instead */
  tubes: [] as Box[],
};

/* ---------------- the door scene (5504×3072) ---------------- */
export const DOOR = {
  w: 5504,
  h: 3072,
  widths: [1600, 2560, 3840, 5504] as const,
  url: (w: number) => `/assets/door/door-${w}.webp`,
  leaf: { x: 2254, y: 535, w: 994, h: 2185 },
  sign: { x: 2491, y: 217, w: 559, h: 160 },
  led: { x: 3575, y: 1281 },
  keypad: { x: 3508, y: 1253, w: 135, h: 197 },
  handle: { x: 3132, y: 1357, w: 40, h: 540 },
};

export function pickWidth(widths: readonly number[], cssWidth: number) {
  const need = cssWidth * Math.min(2, window.devicePixelRatio || 1);
  return widths.find((w) => w >= need) ?? widths[widths.length - 1];
}
