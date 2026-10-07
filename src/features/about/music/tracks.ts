/**
 * The playlist on the MP3 player. CONTOH — ganti dengan data asli: every track here is an original
 * little loop, synthesised live with Web Audio (no recordings, no one else's music). To play a real
 * file instead, drop it in public/music and set `src` (it then plays as a normal audio file).
 */

export type Voice = "lofi" | "flute" | "piano" | "bell" | "chip";

export type Track = {
  id: string;
  title: string;
  artist: string;
  bpm: number;
  /** Pad chords, one per bar (note names). */
  chords: string[][];
  /** Melody, 16 steps per bar: a note name or "." for a rest. */
  melody: string;
  /** An optional second line on bells. */
  counter?: string;
  voice: Voice;
  drums: "none" | "soft" | "beat";
  /** How many times the bars repeat before the track ends. */
  loops: number;
  /** Waves under the music. */
  sea?: boolean;
  /** A real audio file to play instead of the synth. */
  src?: string;
  glyph: string;
  art: string;
};

export const tracks: Track[] = [
  {
    id: "bekasi",
    title: "Bekasi, 6 a.m.",
    artist: "Moci & the Synths",
    bpm: 84,
    chords: [
      ["F3", "A3", "C4", "E4"],
      ["E3", "G3", "B3", "D4"],
      ["D3", "F3", "A3", "C4"],
      ["C3", "E3", "G3", "B3"],
    ],
    melody:
      "E5 . . G5 . A5 . . G5 . E5 . . . . . " +
      "D5 . . E5 . G5 . . B5 . A5 . G5 . . . " +
      "F5 . . E5 . D5 . . C5 . D5 . . . . . " +
      "E5 . . . G5 . . . C5 . . . . . . .",
    voice: "lofi",
    drums: "soft",
    loops: 4,
    glyph: "🌤️",
    art: "linear-gradient(160deg, #fff1d6, #ffd3e8 45%, #b9dcff)",
  },
  {
    id: "turnips",
    title: "Field of Turnips",
    artist: "Moci & the Synths",
    bpm: 104,
    chords: [
      ["C4", "E4", "G4"],
      ["F3", "A3", "C4"],
      ["G3", "B3", "D4"],
      ["C4", "E4", "G4"],
    ],
    melody:
      "G5 . E5 . G5 . A5 . G5 . E5 . D5 . C5 . " +
      "A5 . . . C6 . A5 . G5 . . . E5 . . . " +
      "D5 . E5 . G5 . . . A5 . G5 . E5 . D5 . " +
      "C5 . . . . . . . E5 . D5 . C5 . . .",
    voice: "flute",
    drums: "soft",
    loops: 4,
    glyph: "🌾",
    art: "linear-gradient(160deg, #fff6c9, #ffe08a 40%, #bfe8b0)",
  },
  {
    id: "keyblade",
    title: "Keyblade Daydream",
    artist: "Moci & the Synths",
    bpm: 88,
    chords: [
      ["A3", "C4", "E4"],
      ["F3", "A3", "C4"],
      ["C4", "E4", "G4"],
      ["G3", "B3", "D4"],
    ],
    melody:
      "A4 C5 E5 A5 E5 C5 A4 C5 E5 A5 B5 A5 E5 C5 A4 E5 " +
      "F4 A4 C5 F5 C5 A4 F4 A4 C5 F5 G5 F5 C5 A4 F4 C5 " +
      "C5 E5 G5 C6 G5 E5 C5 E5 G5 C6 D6 C6 G5 E5 C5 G5 " +
      "G4 B4 D5 G5 D5 B4 G4 B4 D5 G5 A5 G5 D5 B4 G4 D5",
    counter:
      "E6 . . . . . . . . . . . C6 . . . " +
      "C6 . . . . . . . A5 . . . . . . . " +
      "G5 . . . . . . . E6 . . . D6 . . . " +
      "B5 . . . . . . . . . . . . . . .",
    voice: "piano",
    drums: "none",
    loops: 3,
    glyph: "🗝️",
    art: "linear-gradient(160deg, #e8e3ff, #b9adff 45%, #9ccfff)",
  },
  {
    id: "tide",
    title: "Low Tide",
    artist: "Moci & the Synths",
    bpm: 70,
    chords: [
      ["D3", "F#3", "A3", "E4"],
      ["B2", "D3", "F#3", "A3"],
      ["G2", "B2", "D3", "F#3"],
      ["A2", "C#3", "E3", "A3"],
    ],
    melody:
      "F#5 . . . . . . . A5 . . . . . . . " +
      "D5 . . . . . . . . . . . E5 . . . " +
      "B4 . . . . . . . D5 . . . F#5 . . . " +
      "E5 . . . . . . . . . . . . . . .",
    voice: "bell",
    drums: "none",
    loops: 4,
    sea: true,
    glyph: "🌊",
    art: "linear-gradient(160deg, #e3f4ff, #9fd8ff 45%, #63b2ee)",
  },
  {
    id: "deploy",
    title: "Deploy Friday",
    artist: "Moci & the Synths",
    bpm: 128,
    chords: [
      ["C4", "E4", "G4"],
      ["A3", "C4", "E4"],
      ["F3", "A3", "C4"],
      ["G3", "B3", "D4"],
    ],
    melody:
      "C5 . E5 . G5 . C6 . B5 . G5 . E5 . G5 . " +
      "A5 . . A5 C6 . A5 . E5 . . . C5 . E5 . " +
      "F5 . A5 . C6 . F5 . E5 . F5 . A5 . C6 . " +
      "B5 . . . D6 . B5 . G5 . . . . . . .",
    voice: "chip",
    drums: "beat",
    loops: 4,
    glyph: "🚀",
    art: "linear-gradient(160deg, #ffe0ec, #ff9cc9 45%, #c7c0ff)",
  },
];

const NOTE: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

/** "F#3" → MIDI 54; "." → null. */
export function midi(name: string): number | null {
  const m = /^([A-G])(#|b)?(\d)$/.exec(name);
  if (!m) return null;
  return 12 * (Number(m[3]) + 1) + NOTE[m[1]] + (m[2] === "#" ? 1 : m[2] === "b" ? -1 : 0);
}

export const steps = (line: string) => line.trim().split(/\s+/).map(midi);

/** Seconds per pass through the bars, times the loops. */
export const trackSeconds = (t: Track) => (t.chords.length * 4 * 60 * t.loops) / t.bpm;
