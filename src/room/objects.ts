import type { ObjectId, Overlay } from '@/state';

/**
 * Every object in the room: where it sits (room units, the canvas is 1600 x 900), its depth layer,
 * its label, and what it opens. Nothing in the room is decoration only (client rule).
 * To add an object: add it here, draw it in art.tsx, add its id to ObjectId and ALL_OBJECTS in state.ts.
 */
export type RoomObject = {
  id: ObjectId;
  label: string;
  opens: string;
  /** x, y, w, h in room units: the hit area (art can be larger) */
  box: [number, number, number, number];
  depth: 1 | 2 | 3 | 4;
  action: Overlay | 'figure';
  /** shared view-transition name with a bento tile */
  vt?: string;
};

export const ROOM_W = 1600;
export const ROOM_H = 900;

export const OBJECTS: RoomObject[] = [
  { id: 'mirror', label: 'Mirror', opens: 'Dress the room', box: [58, 236, 140, 470], depth: 2, action: { kind: 'panel', id: 'mirror' } },
  { id: 'window', label: 'Window', opens: 'Her time and yours', box: [262, 96, 360, 392], depth: 1, action: { kind: 'panel', id: 'window' } },
  { id: 'shelf', label: 'Sideboard', opens: 'The archive', box: [272, 528, 344, 172], depth: 2, action: { kind: 'panel', id: 'archive' } },
  { id: 'frame-p1', label: 'Frame 1', opens: 'Project run 01', box: [770, 168, 138, 182], depth: 1, action: { kind: 'run', id: 'p1' }, vt: 'frame-p1' },
  { id: 'frame-p2', label: 'Frame 2', opens: 'Project run 02', box: [928, 168, 150, 108], depth: 1, action: { kind: 'run', id: 'p2' }, vt: 'frame-p2' },
  { id: 'frame-p3', label: 'Frame 3', opens: 'Project run 03', box: [928, 292, 150, 104], depth: 1, action: { kind: 'run', id: 'p3' }, vt: 'frame-p3' },
  { id: 'today', label: 'Today board', opens: 'Availability and focus', box: [1150, 132, 250, 210], depth: 1, action: { kind: 'panel', id: 'today' } },
  { id: 'sofa', label: 'Sofa', opens: 'Sit down: photo mode', box: [748, 520, 392, 210], depth: 2, action: { kind: 'photo' } },
  { id: 'desk', label: 'Desk', opens: 'Skills, and where to check them', box: [1170, 420, 330, 330], depth: 2, action: { kind: 'panel', id: 'skills' }, vt: 'desk' },
  { id: 'keycap', label: 'A clear keycap', opens: 'Press it', box: [1426, 566, 48, 40], depth: 3, action: { kind: 'panel', id: 'egg' } },
  { id: 'figure', label: 'Adelia', opens: 'Say hello', box: [622, 360, 150, 480], depth: 4, action: 'figure' },
  { id: 'phone', label: 'Phone', opens: 'Her phone', box: [880, 742, 120, 70], depth: 4, action: { kind: 'phone' }, vt: 'phone' },
];

/** Where the room opens on phones: the figure, the frames and the phone. */
export const CENTER_X = 880;
