import { useApp, openOverlay } from '@/state';
import { enterRoom, leaveRoom } from '@/journey';
import { person } from '@/content/site';
import './header.css';

/**
 * One liquid-glass pill on both screens (controls are the only liquid glass: trends §8.1).
 * Contact is the only orange on the site. In the room, Back to Bento is the first stop in tab order.
 */
export function Header() {
  const screen = useApp((s) => s.screen);
  const inRoom = screen === 'room';
  return (
    <header className="hdr" data-screen={screen}>
      {inRoom ? (
        <button className="hdr-back liquid" onClick={() => leaveRoom()} data-first>
          <svg viewBox="0 0 16 16" aria-hidden="true">
            <path d="M10 3.5L5.5 8l4.5 4.5" />
          </svg>
          <span>Back to Bento</span>
        </button>
      ) : (
        <a className="hdr-mark liquid" href="/" aria-label="adelia.cc, home">
          <span className="hdr-mono" aria-hidden="true">
            A
          </span>
          <span className="hdr-domain">adelia.cc</span>
        </a>
      )}
      <nav className="hdr-nav liquid" aria-label="Main">
        {!inRoom && (
          <>
            <a className="hdr-link" href="#work">
              Work
            </a>
            <button className="hdr-link" onClick={(e) => enterRoom({ from: e.currentTarget })}>
              Room
            </button>
          </>
        )}
        {inRoom && (
          <button className="hdr-link" onClick={() => openOverlay({ kind: 'panel', id: 'list' })}>
            Objects
          </button>
        )}
        <a className="hdr-contact btn btn-commit btn-sm" href={`mailto:${person.email}?subject=${encodeURIComponent('Hello from adelia.cc')}`}>
          Email Adelia
        </a>
      </nav>
    </header>
  );
}
