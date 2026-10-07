/*
 * Lintas screens (CONTOH — ganti dengan screenshot asli): one "leave by" time, a live replan
 * with its one-line reason, the carriages, and the calm "nothing better right now" state.
 */

const crowd = (s: string) => s.split("").map((c, i) => <i key={i} className={c === "-" ? undefined : c} />);

function Legs() {
  return (
    <ul className="ln-legs">
      <li>
        <span className="ln-mode">🚶</span>
        <span>
          Walk to Bekasi station
          <small>6 min</small>
        </span>
      </li>
      <li>
        <span className="ln-mode ln-mode--krl">KRL</span>
        <span>
          Bekasi line · 06:58 → Manggarai
          <small>Packed until Jatinegara</small>
          <span className="ln-crowd">{crowd("rrraagg")}</span>
        </span>
      </li>
      <li>
        <span className="ln-mode ln-mode--krl">KRL</span>
        <span>
          Bogor line · 07:41 → Sudirman
          <small>Seats likely</small>
          <span className="ln-crowd">{crowd("agggggg")}</span>
        </span>
      </li>
    </ul>
  );
}

/** Home: one number. Everything else is a swipe away. */
export function LintasHome() {
  return (
    <div className="ln">
      <p className="ln-hi">
        Tuesday · <b>Home → Office</b>
      </p>
      <div className="ln-hero">
        <span className="ln-label">Leave by</span>
        <span className="ln-time">06:52</span>
        <p className="ln-sub">
          At Sudirman by <b>07:58</b> · 66 min door to door
        </p>
        <Legs />
      </div>
      <p className="ln-tip">↳ Board carriages 9–10, they empty first</p>
      <div className="ln-tabs">
        <span>Today</span>
        <span>Alerts</span>
        <span>Me</span>
      </div>
    </div>
  );
}

/** A delay hits: one sentence on what changed, what to do, what it costs. */
export function LintasReplan() {
  return (
    <div className="ln">
      <p className="ln-hi">
        Tuesday · <b>Home → Office</b>
      </p>
      <div className="ln-hero">
        <span className="ln-label">Leave by</span>
        <span className="ln-time" style={{ color: "var(--ln-muted)", textDecoration: "line-through", textDecorationThickness: "0.06em" }}>
          06:52
        </span>
      </div>
      <span className="dp-dim" />
      <div className="ln-push">
        <span className="ln-push__icon">L</span>
        <span>
          <b>Lintas</b> <small>now</small>
          <p>Bekasi line is 15 min late. Leave at 07:01 for the Kranji train instead: you&apos;ll still be at your desk by 08:00.</p>
        </span>
      </div>
      <div className="ln-sheet">
        <h4>Switch to the Kranji train?</h4>
        <div className="ln-compare">
          <div data-best="">
            <span className="ln-label">New plan</span>
            <b>07:01</b>
            Arrive 07:56 · seat likely
          </div>
          <div>
            <span className="ln-label">Your plan</span>
            <b>06:52</b>
            Arrive 08:13 · standing
          </div>
        </div>
        <span className="ln-btn ln-btn--go">Switch to 07:01</span>
        <span className="ln-btn">Keep my plan</span>
      </div>
    </div>
  );
}

/** Which carriage: crowding front to back, from riders' one-tap reports. */
export function LintasCarriages() {
  const cars = ["r", "r", "a", "a", "r", "a", "g", "a", "g", "g", "a", "r"];
  return (
    <div className="ln">
      <p className="ln-hi">
        Your train · <b>07:14 from Kranji</b>
      </p>
      <div className="ln-hero">
        <span className="ln-label">Least crowded</span>
        <span className="ln-time" style={{ fontSize: "2.6em" }}>
          Car 9
        </span>
        <p className="ln-sub">From 214 rider reports this month, weekdays 06:30–07:30</p>
        <div className="ln-train">
          {cars.map((c, i) => (
            <span key={i} className={`ln-car ${c}`} data-best={i === 8 ? "" : undefined}>
              {i + 1}
              {(i === 0 || i === 11) && <small>women</small>}
            </span>
          ))}
        </div>
        <p className="ln-legend">
          <span>
            <i style={{ background: "var(--ln-lime)" }} />
            Room to stand
          </span>
          <span>
            <i style={{ background: "var(--ln-amber)" }} />
            Tight
          </span>
          <span>
            <i style={{ background: "var(--ln-red)" }} />
            Packed
          </span>
        </p>
      </div>
      <p className="ln-tip">↳ Your stop exit is nearest car 9 at Manggarai</p>
      <div className="ln-tabs">
        <span>Today</span>
        <span>Alerts</span>
        <span>Me</span>
      </div>
    </div>
  );
}

/** When there's nothing better: say so, once, and stay quiet. */
export function LintasCalm() {
  return (
    <div className="ln">
      <p className="ln-hi">
        Tuesday · <b>Home → Office</b>
      </p>
      <div className="ln-hero">
        <span className="ln-label">Leave by</span>
        <span className="ln-time">07:05</span>
        <p className="ln-sub">
          At Sudirman by <b>08:12</b> · running 12 min late today
        </p>
      </div>
      <div className="ln-calm">
        <h4>Nothing faster right now</h4>
        <p>Your 07:12 train is still your best option. I&apos;ll only ping you if that changes.</p>
        <p className="ln-why">Why: TransJakarta 6B is also delayed at Cawang, and the MRT detour adds 18 min.</p>
      </div>
      <div className="ln-tabs">
        <span>Today</span>
        <span>Alerts</span>
        <span>Me</span>
      </div>
    </div>
  );
}
