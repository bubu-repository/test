/*
 * The rounds before each final design, as low-fidelity wireframes (CONTOH — ganti dengan sketsa asli).
 * Shown next to what testing found, so the reader sees why the winner won.
 */

const Lines = ({ widths }: { widths: string[] }) => (
  <>
    {widths.map((w, i) => (
      <span key={i} className="wf-bar" style={{ width: w }} />
    ))}
  </>
);

/* ----- Tenderlens: where the score goes ----- */
export function TlWireSummary() {
  return (
    <div className="wf">
      <span className="wf-title" />
      <Lines widths={["96%", "90%", "94%", "70%"]} />
      <span className="wf-note">Summary</span>
      <Lines widths={["92%", "96%", "88%", "94%", "90%", "60%", "94%", "86%", "92%", "50%"]} />
      <div className="wf-box wf-row" style={{ marginTop: "auto" }}>
        <span className="wf-note">Score: 82</span>
      </div>
    </div>
  );
}

export function TlWireScore() {
  return (
    <div className="wf" style={{ alignItems: "center", justifyContent: "center" }}>
      <span className="wf-title" style={{ width: "60%" }} />
      <div className="wf-circle" style={{ width: "8em", height: "8em", fontSize: "1.3em" }}>
        82
      </div>
      <span className="wf-chip">BID</span>
      <span className="wf-btn" style={{ width: "100%", marginTop: "auto" }}>
        Start the bid
      </span>
    </div>
  );
}

export function TlWireReasons() {
  return (
    <div className="wf">
      <span className="wf-title" />
      <span className="wf-bar" style={{ width: "60%" }} />
      <div className="wf-box wf-row">
        <span className="wf-circle">82</span>
        <span style={{ flex: 1, display: "grid", gap: "0.4em" }}>
          <span className="wf-chip" style={{ width: "fit-content" }}>
            BID
          </span>
          <span className="wf-bar" style={{ width: "90%" }} />
        </span>
      </div>
      {["p.23", "p.41", "p.88"].map((p) => (
        <div key={p} className="wf-row">
          <span className="wf-dot" />
          <span className="wf-bar" style={{ flex: 1 }} />
          <span className="wf-chip">{p}</span>
        </div>
      ))}
      <span className="wf-btn" style={{ marginTop: "auto" }}>
        Start the bid
      </span>
    </div>
  );
}

/* ----- Catat: how a confirmation reads ----- */
export function CtWireReceipt() {
  return (
    <div className="wf" style={{ justifyContent: "flex-end" }}>
      <span className="wf-bubble wf-bubble--out">🎙 0:06</span>
      <span className="wf-bubble">
        <b>Transaksi tercatat</b>
        <span className="wf-table">
          <span>Tanggal</span>
          <span>14/10/2025</span>
          <span>Barang</span>
          <span>Indomie Goreng</span>
          <span>Jumlah</span>
          <span>2</span>
          <span>Harga</span>
          <span>Rp3.500</span>
          <span>Total</span>
          <span>Rp7.000</span>
        </span>
        <br />
        Balas BENAR atau SALAH
      </span>
    </div>
  );
}

export function CtWireLine() {
  return (
    <div className="wf" style={{ justifyContent: "flex-end" }}>
      <span className="wf-bubble wf-bubble--out">🎙 0:06</span>
      <span className="wf-bubble">Dicatat: 2 Indomie Goreng, Rp7.000</span>
      <span className="wf-bubble wf-bubble--out">🎙 0:04</span>
      <span className="wf-bubble">Dicatat: 1 dus Aqua Gelas, Rp10.000</span>
    </div>
  );
}

export function CtWireButtons() {
  return (
    <div className="wf" style={{ justifyContent: "flex-end" }}>
      <span className="wf-bubble wf-bubble--out">🎙 0:06</span>
      <span className="wf-bubble">✓ Terjual 2 Indomie Goreng · Rp7.000</span>
      <div className="wf-row" style={{ width: "86%" }}>
        <span className="wf-btn wf-btn--ghost" style={{ flex: 1 }}>
          ✓ Benar
        </span>
        <span className="wf-btn wf-btn--ghost" style={{ flex: 1 }}>
          ✗ Batalkan
        </span>
      </div>
    </div>
  );
}

/* ----- Lintas: what the home screen leads with ----- */
export function LnWireMap() {
  return (
    <div className="wf">
      <div className="wf-map">
        <svg viewBox="0 0 100 160" preserveAspectRatio="none" aria-hidden="true">
          <path d="M12 140 C 30 110, 40 90, 52 70 S 80 30, 88 14" fill="none" stroke="#8b93ab" strokeWidth="2.4" strokeDasharray="5 3" />
          <path d="M12 140 C 40 130, 60 100, 70 80 S 84 40, 88 14" fill="none" stroke="#b4bbcd" strokeWidth="2" />
          <circle cx="12" cy="140" r="4" fill="#8b93ab" />
          <circle cx="88" cy="14" r="4" fill="#8b93ab" />
        </svg>
      </div>
      <div className="wf-box">
        <Lines widths={["70%", "50%"]} />
      </div>
    </div>
  );
}

export function LnWireOptions() {
  return (
    <div className="wf">
      <span className="wf-note">3 routes</span>
      {["66 min", "71 min", "74 min"].map((t) => (
        <div key={t} className="wf-box">
          <div className="wf-row" style={{ justifyContent: "space-between" }}>
            <span className="wf-note">{t}</span>
            <span className="wf-chip">KRL · MRT</span>
          </div>
          <span className="wf-bar" style={{ width: "80%", marginTop: "0.5em" }} />
          <span className="wf-bar" style={{ width: "55%", marginTop: "0.35em" }} />
        </div>
      ))}
    </div>
  );
}

export function LnWireOne() {
  return (
    <div className="wf">
      <span className="wf-bar" style={{ width: "45%" }} />
      <div className="wf-box" style={{ display: "grid", gap: "0.5em" }}>
        <span className="wf-note">Leave by</span>
        <span style={{ fontSize: "2.6em", fontWeight: 800, color: "#4b536b", letterSpacing: "-0.04em", lineHeight: 1 }}>06:52</span>
        <span className="wf-bar" style={{ width: "70%" }} />
        <span className="wf-bar" style={{ width: "90%", height: "0.4em" }} />
        <span className="wf-bar" style={{ width: "90%", height: "0.4em" }} />
      </div>
      <span className="wf-bar" style={{ width: "60%" }} />
    </div>
  );
}
