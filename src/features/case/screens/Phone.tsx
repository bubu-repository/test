import type { CSSProperties, ReactNode } from 'react';

const cx = (...xs: (string | false | null | undefined)[]) => xs.filter(Boolean).join(' ');

/**
 * A phone, drawn in CSS (ported from the old adelia.cc): a pearl-and-chrome frame, a Dynamic Island
 * (or an Android punch-hole) and a status bar, with a product screen inside. Everything inside is
 * sized in em off the phone's own width (container query units), so a screen looks the same as a
 * 120px thumbnail and as a 300px figure. The screens inside keep each product's own look.
 */
export function Phone({
  children,
  time = '9:41',
  dark = false,
  android = false,
  className,
  style,
  label,
}: {
  children: ReactNode;
  time?: string;
  dark?: boolean;
  android?: boolean;
  className?: string;
  style?: CSSProperties;
  label?: string;
}) {
  return (
    <div className={cx('dp', android && 'dp--android', className)} style={style} role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : true}>
      <div className="dp__frame">
        <div className={cx('dp__screen', dark && 'dp__screen--dark')}>
          <span className="dp__island" />
          <div className="dp__status">
            <span>{time}</span>
            <span className="dp__icons">
              <svg viewBox="0 0 18 12" width="1.15em" height="0.75em">
                <rect x="0" y="8" width="3" height="4" rx="1" fill="currentColor" />
                <rect x="5" y="5.5" width="3" height="6.5" rx="1" fill="currentColor" />
                <rect x="10" y="3" width="3" height="9" rx="1" fill="currentColor" />
                <rect x="15" y="0" width="3" height="12" rx="1" fill="currentColor" />
              </svg>
              <svg viewBox="0 0 16 12" width="1.05em" height="0.75em">
                <path d="M8 11.5 5.6 9a3.4 3.4 0 0 1 4.8 0Z M3.4 6.8a6.5 6.5 0 0 1 9.2 0l-1.4 1.4a4.5 4.5 0 0 0-6.4 0Z M1 4.4a9.9 9.9 0 0 1 14 0l-1.4 1.4a7.9 7.9 0 0 0-11.2 0Z" fill="currentColor" />
              </svg>
              <svg viewBox="0 0 27 13" width="1.6em" height="0.78em">
                <rect x="0.5" y="0.5" width="23" height="12" rx="3.5" fill="none" stroke="currentColor" strokeOpacity=".4" />
                <rect x="2.5" y="2.5" width="17" height="8" rx="2" fill="currentColor" />
                <path d="M25 4.5v4a2 2 0 0 0 0-4Z" fill="currentColor" fillOpacity=".4" />
              </svg>
            </span>
          </div>
          <div className="dp__body">{children}</div>
          <span className="dp__home" />
        </div>
      </div>
    </div>
  );
}
