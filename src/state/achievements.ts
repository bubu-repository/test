/* ==========================================================================
   Stickers (achievements) + Guest Pass tiers. Pure data — logic lives in
   state/game.ts, which unlocks by id, so the 22 ids from dside (plus 'signed', the guestbook) below
   must not change. Names, hints and bodies are Adelia’s, and fold in the
   spirit of the legacy adelia.cc sticker book (First hello, Card collector,
   Shell native, Desk DJ, Cloud parter…).
   Hints are what a locked sticker says; bodies are the unlock toast, so keep
   them to one short line. Glyphs are 1–2 plain characters engraved on the
   sticker (no emoji: only characters without an emoji presentation).
   ========================================================================== */
import type { ChapterId } from '@/lib/content';

export type AchievementId =
  | 'first-step'
  | 'time-keeper'
  | 'weather-watcher'
  | 'news-hound'
  | 'power-user'
  | 'hacker'
  | 'gamer'
  | 'high-score'
  | 'beatmaker'
  | 'selector'
  | 'curator'
  | 'collector'
  | 'oracle'
  | 'rsvp'
  | 'insider'
  | 'explorer'
  | 'night-owl'
  | 'connected'
  | 'card-holder'
  | 'operator'
  | 'signed'
  | 'maker'
  | 'manifesto'
  | 'completionist';

export interface Achievement {
  id: AchievementId;
  name: string;
  hint: string; // shown while locked
  body: string; // shown when unlocked (and in the unlock toast)
  points: number; // hearts (♥)
  glyph: string; // 1–2 chars engraved on the sticker
  secret?: boolean;
}

/** In the order the sticker book shows them: arriving, then what a recruiter came for, then play, then the hunts. */
export const ACHIEVEMENTS: Achievement[] = [
  { id: 'first-step', name: 'First hello', glyph: 'Hi', points: 50, hint: 'Come in through the door.', body: 'You’re in. Every object in this room opens something.' },
  { id: 'curator', name: 'Card collector', glyph: '04', points: 80, hint: 'Open all four posters on the Wall of Work.', body: 'Tenderlens, Ask HR, Catat, Lintas: all four case studies.' },
  { id: 'collector', name: 'Full toolkit', glyph: '06', points: 80, hint: 'Pick up all six objects on the chrome shelf.', body: 'Cassette, CD, marbles, robot, zines, USB: every spec sheet read.' },
  { id: 'oracle', name: 'Fit check', glyph: '?!', points: 80, hint: 'Take the 60-second fit check at the pink mug, or ask Moci a question.', body: 'You have an answer, and the evidence behind it.' },
  { id: 'rsvp', name: 'On the calendar', glyph: '✓', points: 150, hint: 'Book a chat at the ticket printer.', body: 'Ticket printed. She replies within a day, with times in WIB.' },
  { id: 'connected', name: 'Straight to Adelia', glyph: '@', points: 60, hint: 'Press the big pink button, or take her CV from her ID card.', body: 'The shortest way from this room to her inbox.' },
  { id: 'news-hound', name: 'Paper reader', glyph: '¶', points: 60, hint: 'Read three stories in her paper.', body: 'Three stories in: you know what she shipped this year.' },
  { id: 'power-user', name: 'Booted up', glyph: 'OS', points: 40, hint: 'Switch on the pink computer.', body: 'Adelia OS is on. The case files are on the desktop.' },
  { id: 'time-keeper', name: 'Bekasi time', glyph: '+7', points: 40, hint: 'Check the clock on the wall.', body: 'WIB, UTC+7. Her usual hours are 09:00–18:00.' },
  { id: 'weather-watcher', name: 'Cloud parter', glyph: '°C', points: 40, hint: 'Look out of the window.', body: 'Live sky over Bekasi. Office AC is never kind: bring a jacket.' },
  { id: 'card-holder', name: 'Guest pass', glyph: '▭', points: 60, hint: 'Claim the holo card next to the camera.', body: 'Your Guest Pass is live. Hearts add up on it.' },
  { id: 'insider', name: 'Day-one list', glyph: '→', points: 100, hint: 'Leave your email at the LED strip.', body: 'One note when her start date is set. That’s all.' },
  { id: 'selector', name: 'Desk DJ', glyph: '◉', points: 40, hint: 'Change the record on the turntable.', body: 'Good pick. The B-side unlocks at Guest.' },
  { id: 'beatmaker', name: 'Beatmaker', glyph: '♪', points: 60, hint: 'Program a beat on the baby-blue synth.', body: 'A new track, made in her room.' },
  { id: 'gamer', name: 'Player one', glyph: '1P', points: 40, hint: 'Play a game on the cloud handheld.', body: 'Insert coin. Two more games on the same handheld.' },
  { id: 'high-score', name: 'High score', glyph: '★', points: 120, hint: 'Beat a high score on the cloud handheld.', body: 'Your name is on the board.' },
  { id: 'operator', name: 'Operator', glyph: '☏', points: 80, hint: 'Dial Adelia on the heart phone.', body: 'You heard her voicemail. She calls back by email.' },
  { id: 'signed', name: 'Signed', glyph: '≈', points: 60, hint: 'Release a jelly with a note in the aquarium.', body: 'Your jelly is out, carrying your note round her tank.' },
  { id: 'maker', name: 'Maker', glyph: '◐', points: 60, hint: 'Save something you made in the Studio (the instant camera).', body: 'Printed in her room, and yours to keep.' },
  { id: 'explorer', name: 'Every corner', glyph: '◎', points: 150, hint: 'Visit every object in the room.', body: 'Nothing left unturned: you found them all.' },
  { id: 'manifesto', name: 'House rules', glyph: 'V', points: 250, hint: 'Collect all five House Rules around the room.', body: 'All five House Rules, from the eval to the field.' },
  { id: 'hacker', name: 'Shell native', glyph: '>_', points: 120, hint: 'There’s a terminal in Adelia OS. Try asking it nicely.', body: 'Root access, granted politely.', secret: true },
  { id: 'night-owl', name: 'Night owl', glyph: '☾', points: 60, hint: 'Visit between 22:00 and 05:00 Bekasi time.', body: 'She’s asleep. Moci isn’t.', secret: true },
  { id: 'completionist', name: 'Full set', glyph: '♡', points: 500, hint: 'Collect every other sticker.', body: 'The whole set. You know this room better than I do.', secret: true },
];

export const ACHIEVEMENT_MAP = Object.fromEntries(ACHIEVEMENTS.map((a) => [a.id, a])) as Record<AchievementId, Achievement>;

/** Guest Pass tiers. Ids are the chapter ids (kept in order) because the pass,
 *  the records gate and the manifesto look tiers up by them. Perks are free and
 *  real: nothing on the hiring path (CV, email, case studies, booking) is ever
 *  behind a tier. Colours are the room’s: silver, baby blue, pink-soft, blue, pink. */
export interface Tier {
  id: ChapterId;
  name: string;
  min: number;
  perk: string;
  color: string;
}

export const TIERS: Tier[] = [
  { id: 'toolkit', name: 'Visitor', min: 0, perk: 'Every object in the room is open to you. No sign-up needed.', color: '#b9c8d9' },
  { id: 'proof', name: 'Guest', min: 300, perk: 'Unlocks the B-side “Last Train Home” on the turntable.', color: '#a9d6f5' },
  { id: 'build', name: 'Friend', min: 700, perk: 'A holo foil finish on your Guest Pass, and on the PNG you download.', color: '#ffb3d3' },
  { id: 'play', name: 'Regular', min: 1200, perk: 'A printable sheet of every sticker you’ve collected (PNG).', color: '#5aa9e6' },
  { id: 'hello', name: 'Bestie', min: 2000, perk: 'A thank-you note from Adelia by email, and your name in the room’s credits if you’d like it there.', color: '#ff7eb6' },
];

export function tierFor(points: number): Tier {
  let t = TIERS[0];
  for (const tier of TIERS) if (points >= tier.min) t = tier;
  return t;
}

export function nextTier(points: number): Tier | null {
  return TIERS.find((t) => t.min > points) ?? null;
}
