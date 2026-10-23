/* The room experience: the door, the 2D room and every overlay layer. */
import { useEffect } from 'react';
import { useUI } from './state/ui';
import { useGame } from './state/game';
import { audio } from './audio/engine';
import Stage from './stage/Stage';
import { Door } from './stage/Door';
import * as director from './stage/director';
import { Hud } from './ui/Hud';
import { Toasts, Found, Menu, PanelHost } from './ui/Overlays';

// Debug/automation handle (used by screenshot scripts and QA).
if (typeof window !== 'undefined') (window as unknown as Record<string, unknown>).__room = { ui: useUI, game: useGame, director };

export default function Experience() {
  // keep the audio engine in sync with the persisted mute preference
  useEffect(() => useUI.subscribe((s, p) => s.muted !== p.muted && audio.setMuted(s.muted)), []);

  return (
    <>
      <Stage />
      <Hud />
      <PanelHost />
      <Found />
      <Menu />
      <Toasts />
      <Door />
    </>
  );
}
