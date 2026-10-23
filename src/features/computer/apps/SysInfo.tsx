/* About Adelia OS — the "about this machine" box from the Adelia menu. */
import { sfx } from '@/audio/engine';
import { os } from '../wm';
import { DropMark } from '../icons';
import { MachineSpecs } from './Settings';

export default function SysInfo() {
  return (
    <div className="os-sys scroll">
      <div className="os-sys__mark" aria-hidden>
        <DropMark size={40} />
        <span>adelia</span>
        <b>OS</b>
      </div>
      <p className="os-sys__ver">
        <b>Adelia OS</b> 26.10 <span className="t-spec">· build 2026.10</span>
      </p>
      <MachineSpecs />
      <div className="os-sys__actions">
        <button
          className="btn btn--sm"
          onClick={() => {
            sfx('click');
            os().open('about');
          }}
        >
          Her model card
        </button>
        <button
          className="btn btn--sm btn--dark"
          onClick={() => {
            sfx('click');
            os().open('settings', { section: 'machine' });
          }}
        >
          Settings…
        </button>
      </div>
    </div>
  );
}
