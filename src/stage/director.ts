/* ==========================================================================
   Director — sequences the story beats so the stage, HUD and features stay
   decoupled:
     onCameraArrive(kind)  → after walking in: achievements + music
                           → after a close-up: stamp, "YOU FOUND", panel
     back()                → close panel / leave close-up / back to overview
   The door sequence itself lives in Door.tsx (it is mostly choreography).
   ========================================================================== */
import { useUI } from '@/state/ui';
import { game } from '@/state/game';
import { sfx, audio } from '@/audio/engine';
import { music } from '@/audio/music';
import { ambience } from '@/audio/ambience';
import { track } from '@/lib/api';
import { CHAPTERS } from '@/lib/content';
import { hourIn } from '@/lib/weather';
import { STATIONS, type StationId } from './stations';

const ui = () => useUI.getState();

/** Skip the door (QA, deep links). */
export function enterImmediately() {
  const s = ui();
  s.setFlag('doorUnlocked', true);
  s.setFlag('doorOpen', true);
  s.setFlag('lights', true);
  ambience.start();
  s.setPhase('room');
  afterEntered();
}

let entered = false;
function afterEntered() {
  if (entered) return;
  entered = true;
  const g = game();
  g.unlock('first-step');
  g.stamp('door');
  const h = hourIn();
  if (h >= 22 || h < 5) setTimeout(() => game().unlock('night-owl'), 2500);
  if (audio.ready && !audio.isMuted() && !music.playing) setTimeout(() => music.play('studio-hours'), 400);
}

export function onCameraArrive(kind: 'enter' | 'focus' | 'story') {
  const s = ui();
  if (kind === 'enter' && s.phase === 'entering') {
    s.setPhase('room');
    afterEntered();
    return;
  }
  if (kind === 'focus' && s.focus && !s.panel && !s.found) arriveAt(s.focus);
}

function arriveAt(id: StationId) {
  const st = STATIONS[id];
  const g = game();
  const isNew = g.stamp(id);
  track('station', { station: id, first: isNew });
  ambience.setFocus(true);

  if (st.manifesto && !g.manifesto[st.manifesto]) {
    g.writeLine(st.manifesto);
    const chapter = CHAPTERS.find((c) => c.id === st.manifesto)!;
    sfx('found');
    ui().showFound({ station: id, line: chapter.line });
    return; // the panel opens when the found card is dismissed
  }
  openStationPanel(id);
}

function openStationPanel(id: StationId) {
  const s = ui();
  const panel = s.pendingPanel ?? STATIONS[id].panel;
  if (!panel) return;
  sfx('open');
  s.openPanel(panel, s.pendingProps);
  s.setPendingProps({});
}

/** Called by the found overlay. `read` opens the manifesto instead of the station panel. */
export function continueFromFound(read = false) {
  const s = ui();
  const f = s.found;
  s.dismissFound();
  if (!f) return;
  if (read) {
    sfx('paper');
    s.openPanel('manifesto', { highlight: STATIONS[f.station].manifesto });
    return;
  }
  openStationPanel(f.station);
}

/** Universal back: found → panel → close-up → overview. */
export function back() {
  const s = ui();
  if (s.found) {
    s.dismissFound();
    s.clearFocus();
    sfx('back');
    return;
  }
  if (s.panel || s.focus) {
    s.clearFocus();
    s.setPendingProps({});
    ambience.setFocus(false);
    sfx('back');
    return;
  }
  if (s.view !== 0) {
    s.setView(0);
    sfx('whoosh');
  }
}

export function goView(delta: 1 | -1) {
  const s = ui();
  if (s.phase !== 'room' || s.found) return;
  if (s.panel || s.focus) {
    s.clearFocus();
    ambience.setFocus(false);
  }
  if (delta > 0) s.nextView();
  else s.prevView();
  sfx('whoosh');
  track('view', { view: ui().view });
}

export function focus(id: StationId, props: Record<string, unknown> = {}) {
  const s = ui();
  if (s.phase !== 'room') return;
  sfx('click');
  s.setPendingProps(props);
  s.focusStation(id);
}
