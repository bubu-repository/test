import type { Weather } from "@/app/api/weather/route";

/*
 * Today's pack, in the Lab: one pack a day per visitor, three cards. Something kind, a bit of advice
 * from today's weather in Bekasi, and one more: a small piece of advice, or (about one pack in eight)
 * a holo rare of one of her products. The words are hers to change.
 */

export const KIND_WORDS = [
  "You're allowed to take up space today.",
  "Done is kind. Perfect can wait.",
  "You've survived every hard day so far. Undefeated.",
  "Small steps still count as steps.",
  "You don't have to earn rest.",
  "Your pace is a fine pace.",
  "Be as gentle with yourself as you are with your friends.",
  "You are more than your inbox.",
  "It's okay to start the day again after lunch.",
  "Today you only have to do today.",
  "Asking for help is a skill. You have it.",
  "Your weird ideas are usually your best ones.",
  "You're doing better than your brain says.",
  "Not every day has to be productive to be good.",
  "Mistakes mean you were trying.",
  "Soft is not the same as weak.",
  "The sea never rushes, and it still gets everywhere.",
  "You are a work in progress, and the progress shows.",
  "Someone was happy to see your name today.",
  "Rest is part of the work, not a break from it.",
  "You can be proud of something small.",
  "You don't need a reason to be kind to yourself.",
];

export const ADVICE = [
  "Easy on the snacks today, or you'll be broke by Friday.",
  "Stretch your neck. You've been scrolling.",
  "Text someone you miss. Just “hi” counts.",
  "Close one tab. Only one. You'll feel lighter.",
  "Look at something far away for twenty seconds.",
  "Save the file. Now save it again.",
  "Leave your phone in another room for an hour.",
  "Make your bed. A win before nine.",
  "Write tomorrow's first task down tonight.",
  "Charge your phone before it hits 3%.",
  "Say no to one thing you don't want to do.",
  "Back up your photos. Future you says thanks.",
  "Play a song you loved when you were fifteen.",
  "Take the stairs once. Just once.",
  "Unsubscribe from one email list.",
  "Water your plant. Then check on a friend.",
  "Go outside before the sun goes down.",
  "Eat a real lunch, sitting down.",
];

export type WeatherCard = { text: string; line: string; kind: "hot" | "rain" | "storm" | "cloud" | "clear" | "night" | "haze" | "unknown" };

/** Advice from the sky over Bekasi right now. */
export function weatherCard(w: Weather | null, describe: (code: number | null) => { label: string; kind: string }): WeatherCard {
  if (!w?.ok || w.temperature === null) {
    return { kind: "unknown", line: "Bekasi · no reading", text: "No weather from Bekasi right now. Bring a jacket anyway: office AC is never kind." };
  }
  const t = Math.round(w.temperature);
  const sky = describe(w.code);
  const line = `Bekasi · ${t}°C · ${sky.label}`;
  if (sky.kind === "storm") return { kind: "storm", line, text: "Thunder over Bekasi. Unplug the laptop charger and stay in." };
  if (sky.kind === "rain") return { kind: "rain", line, text: "Rain in Bekasi. Pack a raincoat, or at least a plastic bag for your phone." };
  if (sky.kind === "fog") return { kind: "haze", line, text: "Hazy in Bekasi today. A mask for the commute is a good idea." };
  if (t >= 32) return { kind: "hot", line, text: `It's ${t}° in Bekasi. Cold water today, trust me.` };
  if ((w.humidity ?? 0) >= 85) return { kind: "cloud", line, text: `It's ${w.humidity}% humid. Wear something that breathes.` };
  if (sky.kind === "cloud") return { kind: "cloud", line, text: "Cloudy out there. Pack a raincoat, just in case." };
  if (!w.isDay) return { kind: "night", line, text: "Clear night over Bekasi. Look up for a minute before bed." };
  return { kind: "clear", line, text: "Clear sky in Bekasi. Sunscreen, even for the walk to the warung." };
}
