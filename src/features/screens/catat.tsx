import type { ReactNode } from "react";

/*
 * Catat screens (CONTOH — ganti dengan screenshot asli): the agent inside WhatsApp, in the
 * Indonesian the owners actually speak. The case study captions translate them.
 */

const WAVES = [3, 6, 4, 9, 12, 7, 5, 10, 14, 8, 4, 6, 11, 7, 3, 5, 9, 6, 4, 3];

function Voice({ length }: { length: string }) {
  return (
    <span className="ct-voice">
      <span className="ct-play" />
      <span className="ct-wave">
        {WAVES.map((h, i) => (
          <i key={i} style={{ height: `${h * 6}%` }} />
        ))}
      </span>
      <small>{length}</small>
    </span>
  );
}

function Chat({ children, typing = "Ketik pesan" }: { children: ReactNode; typing?: string }) {
  return (
    <div className="ct">
      <div className="ct-head">
        <span className="ct-back">‹</span>
        <span className="ct-avatar">C</span>
        <span>
          <b>Catat</b>
          <small>buku kas lewat WhatsApp</small>
        </span>
      </div>
      <div className="ct-chat">{children}</div>
      <div className="ct-type">
        <span>{typing}</span>
        <span className="ct-mic">🎙</span>
      </div>
    </div>
  );
}

const In = ({ children, time }: { children: ReactNode; time: string }) => (
  <div className="ct-msg ct-msg--in">
    {children}
    <time>{time}</time>
  </div>
);

const Out = ({ children, time }: { children: ReactNode; time: string }) => (
  <div className="ct-msg ct-msg--out">
    {children}
    <time>
      {time} <b>✓✓</b>
    </time>
  </div>
);

/** Logging a sale by voice: one line back, ✓ to keep it, ✗ to undo. `before`: nothing tapped yet. */
export function CatatSale({ before = false }: { before?: boolean }) {
  return (
    <Chat>
      <span className="ct-day">Hari ini</span>
      <Out time="07:42">
        <Voice length="0:06" />
      </Out>
      <In time="07:42">
        <span className="ct-quiet">&ldquo;Indomie goreng dua, goceng sama dua rebu&rdquo;</span>
        <br />✓ <strong>Terjual 2 Indomie Goreng · Rp7.000</strong>
      </In>
      <div className="ct-btns ct-btns--two">
        <span data-picked={before ? undefined : ""}>✓ Benar</span>
        <span>✗ Batalkan</span>
      </div>
      {!before && (
        <>
          <Out time="07:44">
            <Voice length="0:04" />
          </Out>
          <In time="07:44">
            <span className="ct-quiet">&ldquo;Aqua gelas sedus, tiga puluh lima rebu&rdquo;</span>
            <br />✓ <strong>Stok masuk 1 dus Aqua Gelas (48) · Rp35.000</strong>
          </In>
          <div className="ct-btns ct-btns--two">
            <span>✓ Benar</span>
            <span>✗ Batalkan</span>
          </div>
        </>
      )}
    </Chat>
  );
}

/** When the note is ambiguous, Catat asks one short question instead of guessing. `before`: not answered yet. */
export function CatatAsk({ before = false }: { before?: boolean }) {
  return (
    <Chat>
      <span className="ct-day">Hari ini</span>
      <Out time="09:15">
        <Voice length="0:03" />
      </Out>
      <In time="09:15">
        <span className="ct-quiet">&ldquo;Ceban, Bu Sri&rdquo;</span>
        <br />
        Rp10.000, Bu Sri. Ini <strong>utang baru</strong>, atau Bu Sri <strong>bayar utang</strong>?
      </In>
      <div className="ct-btns ct-btns--two">
        <span>Utang baru</span>
        <span data-picked={before ? undefined : ""}>Bayar utang</span>
      </div>
      {!before && (
        <>
          <In time="09:15">
            ✓ <strong>Bu Sri bayar Rp10.000.</strong>
            <br />
            Sisa utangnya Rp15.000 (sejak 3 Okt).
          </In>
          <div className="ct-btns">
            <span>✗ Batalkan</span>
          </div>
        </>
      )}
    </Chat>
  );
}

export const CatatSaleBefore = () => <CatatSale before />;
export const CatatAskBefore = () => <CatatAsk before />;

/** Undo, in one tap: a misheard count is removed, and it shows how to say it again. */
export function CatatUndo() {
  return (
    <Chat>
      <span className="ct-day">Hari ini</span>
      <Out time="11:02">
        <Voice length="0:05" />
      </Out>
      <In time="11:02">
        <span className="ct-quiet">&ldquo;Teh botol dua, delapan rebu&rdquo;</span>
        <br />✓ <strong>Terjual 3 Teh Botol · Rp8.000</strong>
      </In>
      <div className="ct-btns ct-btns--two">
        <span>✓ Benar</span>
        <span data-picked="">✗ Batalkan</span>
      </div>
      <In time="11:02">
        Oke, dihapus. Tidak masuk ke catatan.
        <br />
        Mau ulang? Kirim lagi aja, misalnya <em>&ldquo;teh botol dua, delapan rebu&rdquo;</em>.
      </In>
    </Chat>
  );
}

/** The Sunday summary: the reason owners kept using it. Only what was logged, and it says so. */
export function CatatSummary() {
  return (
    <Chat>
      <span className="ct-day">Minggu</span>
      <In time="19:00">
        <strong>📒 Ringkasan minggu ini</strong>
        <br />
        <span className="ct-quiet">Dari catatanmu, bukan semua penjualan</span>
        <br />
        <br />
        Penjualan yang dicatat: <strong>Rp1.840.000</strong> (6 dari 7 hari)
        <br />
        Belanja stok: <strong>Rp1.120.000</strong>
        <br />
        Utang lunas: <strong>4 orang · Rp96.000</strong>
        <br />
        <br />
        <strong>Yang masih utang</strong>
        <br />
        Bu Sri · Rp15.000 · 5 hari
        <br />
        Mas Andi · Rp32.000 · 12 hari
        <br />
        <br />
        Hari Kamis belum ada catatan. Mau diisi sekarang?
      </In>
      <div className="ct-btns ct-btns--two">
        <span>Isi sekarang</span>
        <span>Nanti saja</span>
      </div>
    </Chat>
  );
}
