import type { CSSProperties } from "react";

/*
 * Tenderlens screens (CONTOH — ganti dengan screenshot asli). The brief in its four states:
 * confident, unsure, the source of a claim, and disagreeing with it. Plus the morning digest.
 * Decorative markup: the Phone around them carries the accessible label.
 */

const Bar = ({ title, back = "Today" }: { title: string; back?: string }) => (
  <div className="tl-bar">
    <span className="tl-back">‹ {back}</span>
    <b>{title}</b>
    <span aria-hidden="true">⋯</span>
  </div>
);

const ROAD = { meta: "LPSE Kab. Bekasi · closes in 4 days", title: "Road rehabilitation, Tambun Selatan", sub: "HPS Rp 2.4 billion · construction · 214 pages" };
const DRAIN = { meta: "LPSE Kab. Bekasi · closes in 3 days", title: "Drainage works, Cikarang Barat", sub: "HPS Rp 1.1 billion · construction · 168 pages" };

const Head = ({ t = ROAD }: { t?: typeof ROAD }) => (
  <>
    <p className="tl-meta">{t.meta}</p>
    <h3 className="tl-title">{t.title}</h3>
    <p className="tl-sub">{t.sub}</p>
  </>
);

/** The one-page brief, when Tenderlens is confident: a score, three cited reasons, the checklist. */
export function TenderlensBrief({ hot = false }: { hot?: boolean }) {
  return (
    <div className="tl">
      <Bar title="Brief" />
      <div className="tl-scroll">
        <Head />
        <div className="tl-score">
          <div className="tl-ring" style={{ "--v": 82 } as CSSProperties}>
            <b>82</b>
          </div>
          <div>
            <span className="tl-verdict">Bid</span>
            <p>Good fit for you. Three reasons, each with its page:</p>
          </div>
        </div>
        <ul className="tl-reasons">
          <li>
            <i className="ok">✓</i>
            <span>You meet the SBU K1 qualification</span>
            <em className={hot ? "tl-page tl-page--hot" : "tl-page"}>p. 23</em>
          </li>
          <li>
            <i className="ok">✓</i>
            <span>Scope matches your last 4 road jobs</span>
            <em className="tl-page">p. 41</em>
          </li>
          <li>
            <i className="warn">!</i>
            <span>Needs a 5% bank guarantee</span>
            <em className="tl-page">p. 88</em>
          </li>
        </ul>
        <p className="tl-h">Money</p>
        <div className="tl-money">
          <span>
            <small>Contract value</small>
            <b>Rp 2.4 B</b>
          </span>
          <span>
            <small>Bank guarantee</small>
            <b>Rp 120 M</b>
          </span>
          <span>
            <small>Your last 4 jobs</small>
            <b>Rp 0.8–2.1 B</b>
          </span>
        </div>
        <div className="tl-check">
          <div>
            <span>Bid checklist</span>
            <span>9 of 12 ready</span>
          </div>
          <div className="tl-progress">
            <i style={{ width: "75%" }} />
          </div>
        </div>
      </div>
      <div className="tl-cta">
        <span className="tl-btn tl-btn--go">Start the bid</span>
        <span className="tl-btn">Not for us</span>
      </div>
    </div>
  );
}

/** When it can't tell (a different tender, with a blurry scan): no score, why it won't guess, and a person to ask. */
export function TenderlensUnsure() {
  return (
    <div className="tl">
      <Bar title="Brief" />
      <div className="tl-scroll">
        <Head t={DRAIN} />
        <div className="tl-score tl-score--unsure">
          <div className="tl-ring tl-ring--unsure">
            <b>?</b>
          </div>
          <div>
            <span className="tl-verdict tl-verdict--unsure">Can&apos;t tell yet</span>
            <p>The eligibility table is a blurry scan, so I won&apos;t guess.</p>
          </div>
        </div>
        <ul className="tl-reasons">
          <li>
            <i className="warn">?</i>
            <span>Eligibility table unreadable</span>
            <em className="tl-page tl-page--hot">p. 19</em>
          </li>
          <li>
            <i className="ok">✓</i>
            <span>You&apos;ve done 2 drainage jobs like it</span>
            <em className="tl-page">p. 34</em>
          </li>
          <li>
            <i className="ok">✓</i>
            <span>Documents due Thursday, 14:00</span>
            <em className="tl-page">p. 6</em>
          </li>
        </ul>
      </div>
      <div className="tl-cta">
        <span className="tl-btn tl-btn--check">Read page 19 myself</span>
        <span className="tl-btn">Ask Pak Budi to check it</span>
      </div>
    </div>
  );
}

/**
 * Tap a page chip: the page the claim came from, the sentence highlighted, next to the claim, and a
 * way to say it's wrong. Here the scan was misread: the brief says 5%, the page says 3%.
 */
export function TenderlensSource() {
  return (
    <div className="tl">
      <Bar title="Brief" />
      <div className="tl-scroll">
        <Head />
      </div>
      <span className="dp-dim" />
      <div className="tl-sheet">
        <span className="tl-grab" />
        <p className="tl-meta">Page 88 of 214 · Syarat jaminan</p>
        <div className="tl-doc">
          <div className="tl-lines">
            <i style={{ width: "92%" }} />
            <i style={{ width: "84%" }} />
          </div>
          <p>
            Besaran Jaminan Pelaksanaan adalah <mark>3% (tiga persen) dari nilai kontrak</mark>, diserahkan sebelum penandatanganan.
          </p>
          <div className="tl-lines">
            <i style={{ width: "88%" }} />
            <i style={{ width: "60%" }} />
          </div>
        </div>
        <p className="tl-match">
          The brief says: <b>Needs a 5% bank guarantee</b>
        </p>
        <div className="tl-row">
          <span className="tl-btn tl-btn--go">✓ Looks right</span>
          <span className="tl-btn">✗ That&apos;s wrong</span>
        </div>
      </div>
    </div>
  );
}

/** Disagreeing with a claim: three reasons to pick from, and it goes into the eval set. */
export function TenderlensDisagree() {
  return (
    <div className="tl">
      <Bar title="Brief" />
      <div className="tl-scroll">
        <Head />
      </div>
      <span className="dp-dim" />
      <div className="tl-sheet">
        <span className="tl-grab" />
        <p className="tl-title" style={{ fontSize: "1.1em" }}>
          What&apos;s wrong with this reason?
        </p>
        <p className="tl-sub">&ldquo;Needs a 5% bank guarantee&rdquo; · p. 88</p>
        <div className="tl-options">
          <span>It&apos;s on a different page</span>
          <span data-on="">It misread a number</span>
          <span>That rule doesn&apos;t apply to us</span>
        </div>
        <p className="tl-input">The page says 3%, not 5%.</p>
        <div className="tl-row">
          <span className="tl-btn">Cancel</span>
          <span className="tl-btn tl-btn--go">Send</span>
        </div>
        <p className="tl-note">Every correction is reviewed and added to the test set.</p>
      </div>
    </div>
  );
}

/** The morning digest: today's tenders, already scored. */
export function TenderlensDigest() {
  const rows = [
    { score: "82", kind: "go", word: "Bid", name: "Road rehabilitation, Tambun Selatan", meta: "Rp 2.4 B · closes Fri" },
    { score: "?", kind: "check", word: "Check", name: "Drainage works, Cikarang Barat", meta: "Rp 1.1 B · scan unreadable" },
    { score: "18", kind: "no", word: "No", name: "School building, Kota Bekasi", meta: "Needs K2 · you have K1" },
    { score: "64", kind: "go", word: "Bid", name: "Village road paving, Setu", meta: "Rp 780 M · closes Mon" },
  ];
  return (
    <div className="tl">
      <div className="tl-bar">
        <b style={{ fontSize: "1.25em", letterSpacing: "-0.03em" }}>Today</b>
        <span className="tl-back">Filters</span>
      </div>
      <div className="tl-scroll">
        <p className="tl-meta">Tuesday · 4 new tenders for you</p>
        <ul className="tl-list" style={{ marginTop: "0.4em" }}>
          {rows.map((r) => (
            <li key={r.name}>
              <span className={`tl-chip tl-chip--${r.kind}`}>
                <span>
                  {r.score}
                  <small>{r.word}</small>
                </span>
              </span>
              <span>
                <p>{r.name}</p>
                <small>{r.meta}</small>
              </span>
            </li>
          ))}
        </ul>
        <p className="tl-note" style={{ marginTop: "1.2em" }}>
          Scores explain themselves. Tap one to see why.
        </p>
      </div>
    </div>
  );
}
