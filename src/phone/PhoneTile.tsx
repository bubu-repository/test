import { openOverlay } from '@/state';
import { person } from '@/content/site';
import { IconChat, IconNext } from './icons';
import { WORKDAY, Overlap, LockClock, StatusBar, Wallpaper, fmtHours, herClock, useNow, useOverlap } from './shared';
import './phone.css';

/**
 * The bento's phone tile. Her phone crosses the tile's top border and runs on past its bottom edge,
 * where the bento's clip cuts it (objects cross tile borders: docs/concept.md). It shows the live
 * lock screen: her time, the overlap ring and one notification. The whole tile is one button.
 * The device carries data-vt="phone" so the Lead can give it the shared transition name.
 * The tile's own box (slab, padding, grid area) belongs to the bento; this fills it.
 */
export function PhoneTile() {
  const now = useNow();
  const { hours, city } = useOverlap(now);
  const label = `Open ${person.firstName}'s phone. It is ${herClock(now)} in ${person.city}. ${fmtHours(hours)} of her ${WORKDAY} working hours overlap with yours in ${city}. One message: ask me anything.`;
  return (
    <button className="pt" onClick={() => openOverlay({ kind: 'phone' })} aria-label={label}>
      <span className="pt-head" aria-hidden="true">
        <span className="label">Her phone</span>
        <span>
          <span className="pt-line">Her time, and the hours we share</span>
          <span className="pt-open">
            Open
            <IconNext />
          </span>
        </span>
      </span>
      <span className="pt-device" data-vt="phone" aria-hidden="true">
        <span className="pt-screen">
          <Wallpaper />
          <span className="pt-content">
            <StatusBar now={now} />
            <LockClock now={now} compact />
            <span className="pt-card">
              <Overlap now={now} size={40} compact />
            </span>
            <span className="pt-note">
              <IconChat className="pt-note-ico" />
              <span>
                <span className="pt-note-app">Chat</span>
                <span className="pt-note-text">Ask me anything</span>
              </span>
            </span>
          </span>
        </span>
      </span>
    </button>
  );
}
