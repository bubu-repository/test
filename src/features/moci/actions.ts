/* ==========================================================================
   What Moci can do in the room. Both brains propose actions; only these run,
   and only with inputs that name real objects in the room:
     walk_to(station, work?)  walk the camera to an object (its panel opens)
     copy_email()             her email to the clipboard
     set_sound(on)            the room's sound on / off
     book_chat()              walk to the ticket printer
     show_evals()             open "How Moci is tested" inside Moci
   The online brain's tool calls arrive from server/agent.mjs and go through
   toolToAction() here as well, so a forged or confused call is dropped.
   ========================================================================== */
import { identity } from '@/content/profile';
import { audio, sfx } from '@/audio/engine';
import { focus } from '@/stage/director';
import { FOCUS } from '@/stage/plate';
import { STATIONS, type StationId } from '@/stage/stations';
import { useUI } from '@/state/ui';
import type { MociAction } from './brain';
import { ROOM_STATIONS, WORK_SLUGS, sourceFor, spokenName } from './knowledge';

/** A model's tool call → a room action, or null when the tool or its input isn't allowed. */
export function toolToAction(name: unknown, input: unknown): MociAction | null {
  if (typeof name !== 'string' || !input || typeof input !== 'object' || Array.isArray(input)) return null;
  const v = input as Record<string, unknown>;
  switch (name) {
    case 'walk_to': {
      const station = v.station as StationId;
      if (typeof station !== 'string' || !ROOM_STATIONS.includes(station)) return null;
      if (v.work !== undefined && (station !== 'gallery' || typeof v.work !== 'string' || !WORK_SLUGS.includes(v.work))) return null;
      return { type: 'walk', station, ...(v.work ? { props: { work: v.work } } : {}) };
    }
    case 'copy_email':
      return { type: 'copyEmail' };
    case 'set_sound':
      return typeof v.on === 'boolean' ? { type: 'sound', on: v.on } : null;
    case 'book_chat':
      return { type: 'book' };
    case 'show_evals':
      return { type: 'evals' };
    default:
      return null; // an unknown tool never reaches the room
  }
}

const shortName = spokenName;

/** The chip under an answer: what Moci did, in words. */
export function describeAction(a: MociAction): string {
  switch (a.type) {
    case 'walk': {
      const work = typeof a.props?.work === 'string' ? sourceFor(`wall/${a.props.work}`)?.label.replace(/ case study$/, '') : null;
      return `Walk to ${shortName(a.station)}${work ? ` · ${work}` : ''}`;
    }
    case 'copyEmail':
      return 'Copy her email';
    case 'sound':
      return a.on ? 'Sound on' : 'Sound off';
    case 'book':
      return 'Walk to the ticket printer';
    case 'evals':
      return 'Open my evals';
  }
}

/** Walk to an object. Uses the camera when the object has a close-up framing, else opens its panel directly. */
export function walkTo(station: StationId, props: Record<string, unknown> = {}) {
  const s = useUI.getState();
  if (s.focus === station && station !== 'moci') {
    // already there: just reopen its panel with the new props
    const panel = STATIONS[station].panel;
    if (panel) s.openPanel(panel, props);
    return;
  }
  if (FOCUS[station]) focus(station, props);
  else if (STATIONS[station].panel) s.openPanel(STATIONS[station].panel!, props);
}

async function copy(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // older browsers / no permission: a hidden textarea
    try {
      const el = document.createElement('textarea');
      el.value = text;
      el.setAttribute('readonly', '');
      el.style.position = 'fixed';
      el.style.opacity = '0';
      document.body.appendChild(el);
      el.select();
      const ok = document.execCommand('copy');
      el.remove();
      return ok;
    } catch {
      return false;
    }
  }
}

/** Run one action in the room. `evals` is handled by the panel (it's a view inside Moci). */
export async function runAction(a: MociAction): Promise<boolean> {
  switch (a.type) {
    case 'walk':
      walkTo(a.station, a.props);
      return true;
    case 'book':
      walkTo('printer');
      return true;
    case 'copyEmail': {
      const ok = await copy(identity.email);
      if (ok) sfx('success');
      return ok;
    }
    case 'sound': {
      useUI.getState().setMuted(!a.on);
      audio.setMuted(!a.on);
      if (a.on) await audio.unlock().catch(() => {});
      return true;
    }
    case 'evals':
      return true;
  }
}
