/* Trash — where a prompt tuned on vibes went to retire. */
import { useState } from 'react';
import { sfx } from '@/audio/engine';
import { game } from '@/state/game';
import { focus } from '@/stage/director';
import { useOS } from '../wm';
import { FileGlyph } from '../icons';
import { crumple, isTap, once } from '../util';

export const TRASH_FILE = 'prompt_v1_FINAL_feels-better.txt';
export const TRASH_BODY = [
  'You are a helpful assistant.',
  'Be accurate. Do not make things up.',
  'Please. Really, please.',
  '',
  '// tested on: it felt better',
];

export default function Trash() {
  const full = useOS((s) => s.trashFull);
  const calm = useOS((s) => s.calm);
  const [open, setOpen] = useState(false);
  const [sel, setSel] = useState(false);
  const [crumpling, setCrumpling] = useState(false);

  const empty = () => {
    if (!full || crumpling) return;
    setOpen(false);
    setCrumpling(true);
    crumple();
    setTimeout(
      () => {
        useOS.getState().setTrashFull(false);
        setCrumpling(false);
        if (once('trash-emptied')) game().addPoints(25, 'Emptied the Trash');
      },
      calm ? 120 : 1050,
    );
  };

  const view = () => {
    sfx('open');
    setOpen(true);
  };

  return (
    <div className="os-trash">
      <div className="os-toolbar">
        <span className="os-toolbar__meta" aria-live="polite">
          {full ? '1 item · 2 KB' : 'Empty'}
        </span>
        <button className="btn btn--sm btn--dark" disabled={!full || crumpling} onClick={empty}>
          Empty Trash
        </button>
      </div>
      <div className="os-trash__body">
        {full ? (
          <button
            className={`os-trash__file ${sel ? 'is-on' : ''} ${crumpling ? 'is-crumpling' : ''}`}
            aria-label={`${TRASH_FILE}. Double-click or press Enter to open`}
            onClick={(e) => {
              sfx('click');
              setSel(true);
              if (isTap(e.nativeEvent)) view();
            }}
            onDoubleClick={view}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                view();
              }
            }}
          >
            <FileGlyph size={54} ext="TXT" accent />
            <span>{TRASH_FILE}</span>
          </button>
        ) : (
          <div className="os-trash__empty">
            <p className="t-dot">0</p>
            <p>Trash is empty. Only the evals stayed.</p>
          </div>
        )}
        {full && !open && <p className="os-trash__hint t-label">Double-click to open</p>}
      </div>

      {open && (
        <div className="os-dialog" role="alertdialog" aria-modal="true" aria-labelledby="os-trash-msg">
          <div className="os-dialog__card">
            <div className="os-trash__txt" aria-hidden>
              <span className="t-spec">{TRASH_FILE}</span>
              <pre>{TRASH_BODY.join('\n')}</pre>
              <b>No eval</b>
            </div>
            <p className="os-dialog__msg" id="os-trash-msg">
              A prompt tuned on vibes, with no eval behind it. She doesn’t keep those: every change now runs against cases labelled by hand.
            </p>
            <div className="os-dialog__actions">
              <button
                className="btn btn--sm"
                autoFocus
                onClick={() => {
                  sfx('close');
                  setOpen(false);
                }}
              >
                Fair enough
              </button>
              <button
                className="btn btn--sm btn--primary"
                onClick={() => {
                  sfx('whoosh');
                  focus('shelf', { focus: 'evals' });
                }}
              >
                See the evals →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
