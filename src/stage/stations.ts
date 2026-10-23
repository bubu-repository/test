/* ==========================================================================
   Stations = every interactive object in the (2D) room.
   Metadata only — where each object sits in the room image lives in
   src/stage/plate.ts. Panels are opened by the director after the camera
   settles on the object.
   ========================================================================== */
import type { ChapterId } from '@/lib/content';

export type StationId =
  | 'door'
  | 'clock'
  | 'window'
  | 'news'
  | 'computer'
  | 'console'
  | 'synth'
  | 'record'
  | 'shelf'
  | 'vault'
  | 'gallery'
  | 'badges'
  | 'book'
  | 'launch'
  | 'printer'
  | 'pass'
  | 'button'
  | 'quiz'
  | 'phone'
  | 'moci'
  | 'studio'
  | 'pack'
  | 'sea'
  | 'about';

export type PanelId =
  | 'clock'
  | 'weather'
  | 'news'
  | 'computer'
  | 'console'
  | 'synth'
  | 'records'
  | 'products'
  | 'vault'
  | 'gallery'
  | 'achievements'
  | 'pass'
  | 'rsvp'
  | 'launch'
  | 'redirect'
  | 'quiz'
  | 'phone'
  | 'manifesto'
  | 'moci'
  | 'studio'
  | 'pack'
  | 'sea'
  | 'about';

export type Vec3 = [number, number, number];

export type StationIcon =
  | 'clock'
  | 'cloud'
  | 'paper'
  | 'monitor'
  | 'gamepad'
  | 'keys'
  | 'vinyl'
  | 'box'
  | 'frame'
  | 'trophy'
  | 'rocket'
  | 'ticket'
  | 'card'
  | 'power'
  | 'question'
  | 'phone'
  | 'door'
  | 'lock';

export interface Station {
  id: StationId;
  code: string; // engraved label, e.g. "ST-03"
  name: string; // "The Newspaper"
  verb: string; // hover label / instruction copy
  icon: StationIcon;
  chapter: ChapterId | 'prologue';
  panel?: PanelId;
  /** key objects write a line of the House Rules the first time they are found */
  manifesto?: ChapterId;
  points: number; // awarded on first visit
}

export const STATIONS: Record<StationId, Station> = {
  door: { id: 'door', code: 'RM-00', name: 'The door', verb: 'Knock and come in', icon: 'door', chapter: 'prologue', points: 50 },

  // I · TOOLKIT — the chrome shelf: what she builds with, and the gacha machine
  shelf: { id: 'shelf', code: 'RM-01', name: 'The toolkit', verb: 'Pick up a tool — six objects, six spec sheets', icon: 'box', chapter: 'toolkit', panel: 'products', points: 40 },
  vault: { id: 'vault', code: 'RM-02', name: 'The gacha machine', verb: 'Turn the crank — Tenderlens, module by module, in 3D', icon: 'lock', chapter: 'toolkit', panel: 'vault', manifesto: 'toolkit', points: 60 },

  // II · PROOF — the four posters (case studies), the paper, the printer, the mug
  gallery: { id: 'gallery', code: 'RM-03', name: 'The Wall of Work', verb: 'Read the case studies — four products with real users', icon: 'frame', chapter: 'proof', panel: 'gallery', points: 40 },
  news: { id: 'news', code: 'RM-04', name: 'Her paper', verb: 'Read the paper — what she shipped, and what’s next', icon: 'paper', chapter: 'proof', panel: 'news', manifesto: 'proof', points: 40 },
  printer: { id: 'printer', code: 'RM-05', name: 'The ticket printer', verb: 'Book a chat — intro call, interview or coffee', icon: 'ticket', chapter: 'proof', panel: 'rsvp', points: 30 },
  quiz: { id: 'quiz', code: 'RM-06', name: 'The pink mug', verb: 'Is she a fit? — a 60-second check for hiring teams', icon: 'question', chapter: 'proof', panel: 'quiz', points: 30 },

  // III · BUILD — the computer and the sticker binder
  computer: { id: 'computer', code: 'RM-07', name: 'The pink computer', verb: 'Switch on Adelia OS — case files, terminal and mail', icon: 'monitor', chapter: 'build', panel: 'computer', manifesto: 'build', points: 40 },
  book: { id: 'book', code: 'RM-08', name: 'The sticker book', verb: 'Open the sticker book', icon: 'trophy', chapter: 'proof', panel: 'achievements', points: 20 },

  // IV · PLAY — the wall (board, LED, camera, pass, clock, ID) and the right of the desk
  badges: { id: 'badges', code: 'RM-09', name: 'The gingham board', verb: 'See your stickers — the ones you earn appear here', icon: 'trophy', chapter: 'play', panel: 'achievements', points: 20 },
  launch: { id: 'launch', code: 'RM-10', name: 'The LED strip', verb: 'See the countdown — to her first day on a team', icon: 'rocket', chapter: 'play', panel: 'launch', points: 30 },
  studio: { id: 'studio', code: 'RM-11', name: 'The instant camera', verb: 'Make something — words or a photo, out as a PNG or GIF', icon: 'frame', chapter: 'proof', panel: 'studio', points: 40 },
  pass: { id: 'pass', code: 'RM-12', name: 'The Guest Pass', verb: 'Claim your pass — hearts, tiers and perks', icon: 'card', chapter: 'proof', panel: 'pass', points: 30 },
  clock: { id: 'clock', code: 'RM-13', name: 'The wall clock', verb: 'Check the time — Bekasi (WIB) and your overlap', icon: 'clock', chapter: 'proof', panel: 'clock', points: 30 },
  about: { id: 'about', code: 'RM-14', name: 'Her ID card', verb: 'Who is Adelia? — her story, path and practical details', icon: 'card', chapter: 'proof', panel: 'about', points: 40 },
  pack: { id: 'pack', code: 'RM-15', name: 'Today’s pack', verb: 'Tear it open — one new pack a day', icon: 'box', chapter: 'build', panel: 'pack', points: 30 },
  synth: { id: 'synth', code: 'RM-16', name: 'The synth', verb: 'Make a beat', icon: 'keys', chapter: 'play', panel: 'synth', points: 30 },
  console: { id: 'console', code: 'RM-17', name: 'The cloud handheld', verb: 'Pick it up and play — three games, each with a leaderboard', icon: 'gamepad', chapter: 'play', panel: 'console', points: 40 },
  phone: { id: 'phone', code: 'RM-18', name: 'The heart phone', verb: 'Dial Adelia — and hear her voicemail', icon: 'phone', chapter: 'play', panel: 'phone', points: 30 },
  moci: { id: 'moci', code: 'RM-19', name: 'Moci', verb: 'Ask Moci — questions about Adelia, answered with sources', icon: 'question', chapter: 'play', panel: 'moci', manifesto: 'play', points: 40 },

  // V · HELLO — the window onto Bekasi, the aquarium guestbook, the record player, the big button
  window: { id: 'window', code: 'RM-20', name: 'The window', verb: 'Look outside — live weather over Bekasi', icon: 'cloud', chapter: 'hello', panel: 'weather', manifesto: 'hello', points: 40 },
  sea: { id: 'sea', code: 'RM-21', name: 'The aquarium', verb: 'Sign the guestbook — release a jelly with a note', icon: 'cloud', chapter: 'hello', panel: 'sea', points: 40 },
  record: { id: 'record', code: 'RM-22', name: 'The turntable', verb: 'Change the music', icon: 'vinyl', chapter: 'hello', panel: 'records', points: 30 },
  button: { id: 'button', code: 'RM-23', name: 'The big pink button', verb: 'Press it — email, CV or LinkedIn', icon: 'power', chapter: 'hello', panel: 'redirect', points: 30 },
};

export const STATION_LIST = Object.values(STATIONS);
export const EXPLORABLE = STATION_LIST.filter((s) => s.id !== 'door');

/** How each panel is presented: a right-hand sheet (object stays visible, the
 *  camera shifts left to keep it framed) or a centred stage for immersive apps. */
export const PANEL_LAYOUT: Record<PanelId, 'sheet' | 'stage'> = {
  clock: 'sheet',
  weather: 'sheet',
  records: 'sheet',
  achievements: 'sheet',
  pass: 'sheet',
  manifesto: 'sheet',
  rsvp: 'sheet',
  launch: 'sheet',
  redirect: 'sheet',
  phone: 'sheet',
  about: 'sheet',
  news: 'stage',
  computer: 'stage',
  console: 'stage',
  synth: 'stage',
  products: 'stage',
  vault: 'stage',
  gallery: 'stage',
  quiz: 'stage',
  moci: 'stage',
  studio: 'stage',
  pack: 'stage',
  sea: 'stage',
};

/** Story stops along the single room (left → right), used for scroll/arrow
 *  navigation. Camera boxes live in plate.ts (VIEW_BOXES). */
export const VIEWPOINTS: { id: 'overview' | ChapterId; label: string; stations: StationId[] }[] = [
  { id: 'overview', label: 'Adelia’s Room', stations: [] },
  { id: 'toolkit', label: 'Toolkit', stations: ['shelf', 'vault'] },
  { id: 'proof', label: 'Proof', stations: ['gallery', 'clock', 'about', 'studio', 'pass', 'printer', 'news', 'quiz', 'book'] },
  { id: 'build', label: 'Build', stations: ['computer', 'pack'] },
  { id: 'play', label: 'Play', stations: ['badges', 'launch', 'console', 'synth', 'phone', 'moci'] },
  { id: 'hello', label: 'Hello', stations: ['window', 'sea', 'record', 'button'] },
];
