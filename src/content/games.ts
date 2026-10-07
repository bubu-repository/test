/**
 * The games on the CD shelf on /about. CONTOH — ganti dengan data asli: swap in the games that
 * really shaped you, your hours, and what each one taught you. Titles belong to their publishers;
 * the cover art here is drawn in CSS, not copied.
 */

export type Game = {
  slug: string;
  title: string;
  studio: string;
  platform: string;
  year: number;
  hours: string;
  /** The track on the MP3 player that matches its mood (see features/about/music/tracks.ts). */
  mood: string;
  glyph: string;
  /** Cover art: a soft gradient in the game's colours. */
  art: string;
  /** Disc label colours. */
  label: [string, string];
  taught: string;
  moment: string;
};

export const games: Game[] = [
  {
    slug: "story-of-seasons",
    title: "Story of Seasons",
    studio: "Marvelous",
    platform: "3DS",
    year: 2014,
    hours: "300+ h",
    mood: "turnips",
    glyph: "🌾",
    art: "linear-gradient(160deg, #fff6c9 0%, #ffe08a 38%, #bfe8b0 70%, #9fd8ff 100%)",
    label: ["#ffe58f", "#9fe0b0"],
    taught: "Small daily loops beat big features. Water the crops, talk to one villager, ship one small thing. People come back for the rhythm, not the launch.",
    moment: "The first spring festival, after a whole season of turnips.",
  },
  {
    slug: "kingdom-hearts",
    title: "Kingdom Hearts",
    studio: "Square Enix",
    platform: "PS2",
    year: 2002,
    hours: "120 h",
    mood: "keyblade",
    glyph: "🗝️",
    art: "linear-gradient(160deg, #e8e3ff 0%, #b9adff 40%, #8fb8ff 75%, #ffd3ea 100%)",
    label: ["#c7c0ff", "#9ccfff"],
    taught: "A menu can be a world. Every command feels like a choice, not a form to fill. That's the bar I set for interfaces, agents included.",
    moment: "Dive to the Heart: the tutorial that is also the story.",
  },
  {
    slug: "stardew-valley",
    title: "Stardew Valley",
    studio: "ConcernedApe",
    platform: "PC",
    year: 2016,
    hours: "210 h",
    mood: "turnips",
    glyph: "🍃",
    art: "linear-gradient(160deg, #e2f7e3 0%, #a9e3b8 40%, #8fd3ff 80%, #fff1b8 100%)",
    label: ["#a9e3b8", "#fff1b8"],
    taught: "One stubborn person can ship a whole world, if they care about the tiny details nobody asked for.",
    moment: "Fixing the community center, bundle by bundle.",
  },
  {
    slug: "animal-crossing",
    title: "Animal Crossing: New Horizons",
    studio: "Nintendo",
    platform: "Switch",
    year: 2020,
    hours: "400+ h",
    mood: "bekasi",
    glyph: "🏝️",
    art: "linear-gradient(160deg, #d9f6ff 0%, #9fe3ef 40%, #ffe9a8 78%, #ffd3e8 100%)",
    label: ["#9fe3ef", "#ffe9a8"],
    taught: "Real time is a feature. The island runs on your clock, so does this site: her time, your time, the sky over Bekasi right now.",
    moment: "Catching the first coelacanth in the rain at 5 a.m.",
  },
  {
    slug: "persona-5",
    title: "Persona 5",
    studio: "Atlus",
    platform: "PS4",
    year: 2016,
    hours: "110 h",
    mood: "deploy",
    glyph: "🎭",
    art: "linear-gradient(160deg, #ffe0ec 0%, #ff9cc9 42%, #c7c0ff 78%, #1d2a4d 100%)",
    label: ["#ff9cc9", "#1d2a4d"],
    taught: "Transitions can carry a brand. Even the pause menu has attitude; motion is part of the voice, not decoration.",
    moment: "The first all-out attack screen. Pure UI swagger.",
  },
];
