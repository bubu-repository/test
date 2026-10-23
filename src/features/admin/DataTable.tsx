/* ==========================================================================
   Generic admin table: search · sort · paginate · CSV export · row detail
   drawer · delete (with confirmation). Works in live and local mode.
   `name` is the collection (CSV file name); `noun` is what people read.
   ========================================================================== */
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { toCSV, type Record_ } from '@/lib/api';
import { Icon } from '@/ui/Icon';
import { fmtAgo, fmtTime, ts } from './metrics';

export interface Column {
  key: string;
  label: string;
  render?: (r: Record_) => ReactNode;
  /** value used for sorting/searching (defaults to r[key]) */
  value?: (r: Record_) => string | number;
  width?: string;
  mono?: boolean;
  hideSm?: boolean;
}

const PAGE = 50;

/** What one row is called, for labels and dialogs (e.g. { one: 'booking', many: 'bookings' }). */
export interface Noun {
  one: string;
  many: string;
}

export function cell(v: unknown): string {
  if (v == null || v === '') return '';
  if (Array.isArray(v)) return v.join(', ');
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}

export function downloadText(text: string, filename: string, type = 'text/csv;charset=utf-8') {
  const blob = new Blob([type.startsWith('text/csv') ? '﻿' + text : text], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export function DataTable({
  name,
  noun = { one: name.replace(/s$/, ''), many: name },
  rows,
  columns,
  onDelete,
  toolbar,
  emptyTitle,
  emptyBody,
  defaultSort = { key: 'createdAt', dir: 'desc' as 'asc' | 'desc' },
  rowKey = (r: Record_, i: number) => r.id || String(i),
  canDelete = true,
}: {
  name: string;
  noun?: Noun;
  rows: Record_[];
  columns: Column[];
  onDelete?: (r: Record_) => Promise<void>;
  toolbar?: ReactNode;
  emptyTitle: string;
  emptyBody?: string;
  defaultSort?: { key: string; dir: 'asc' | 'desc' };
  rowKey?: (r: Record_, i: number) => string;
  canDelete?: boolean;
}) {
  const [q, setQ] = useState('');
  const [sort, setSort] = useState(defaultSort);
  const [page, setPage] = useState(0);
  const [open, setOpen] = useState<Record_ | null>(null);
  const [confirm, setConfirm] = useState<Record_ | null>(null);
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState('');

  const colMap = useMemo(() => Object.fromEntries(columns.map((c) => [c.key, c])), [columns]);
  const val = (r: Record_, key: string): string | number => {
    const c = colMap[key];
    if (c?.value) return c.value(r);
    if (key === 'createdAt') return ts(r);
    const v = r[key];
    return typeof v === 'number' ? v : cell(v).toLowerCase();
  };

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    let out = rows;
    if (needle) {
      const terms = needle.split(/\s+/);
      out = rows.filter((r) => {
        const hay = Object.values(r).map(cell).join(' ').toLowerCase();
        return terms.every((t) => hay.includes(t));
      });
    }
    const dir = sort.dir === 'asc' ? 1 : -1;
    return out.slice().sort((a, b) => {
      const va = val(a, sort.key);
      const vb = val(b, sort.key);
      if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * dir;
      return String(va).localeCompare(String(vb)) * dir;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, q, sort, colMap]);

  useEffect(() => setPage(0), [q, sort, rows.length]);
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE));
  const slice = filtered.slice(page * PAGE, page * PAGE + PAGE);

  function toggleSort(key: string) {
    setSort((s) => (s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: key === 'createdAt' ? 'desc' : 'asc' }));
  }

  function exportCSV() {
    const csv = toCSV(filtered);
    if (!csv) return;
    const day = new Date().toISOString().slice(0, 10);
    downloadText(csv, `adelia-room-${name}${q ? '-filtered' : ''}-${day}.csv`);
    setFlash(`Exported ${filtered.length} rows`);
    setTimeout(() => setFlash(''), 2400);
  }

  async function doDelete(r: Record_) {
    if (!onDelete) return;
    setBusy(true);
    try {
      await onDelete(r);
      setFlash('Deleted');
      setTimeout(() => setFlash(''), 2000);
      setConfirm(null);
      if (open?.id === r.id) setOpen(null);
    } catch (e) {
      setFlash(`Delete failed: ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="adm-table">
      <div className="adm-table__bar">
        <label className="adm-search">
          <Icon name="question" size={14} className="sr-only" />
          <span className="sr-only">Search {noun.many}</span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
          <input className="input" type="search" placeholder={`Search ${rows.length.toLocaleString('en-US')} ${rows.length === 1 ? noun.one : noun.many}…`} value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
        {toolbar}
        <span className="adm-table__count t-label" aria-live="polite">
          {flash || `${filtered.length.toLocaleString('en-US')} ${filtered.length === 1 ? 'row' : 'rows'}`}
        </span>
        <button className="btn btn--sm" onClick={exportCSV} disabled={!filtered.length} aria-label={`Export ${filtered.length} ${noun.many} as CSV`}>
          <Icon name="download" size={14} /> CSV
        </button>
      </div>

      {rows.length === 0 ? (
        <div className="adm-emptybox">
          <span className="led led--off" />
          <b>{emptyTitle}</b>
          {emptyBody && <p>{emptyBody}</p>}
        </div>
      ) : filtered.length === 0 ? (
        <div className="adm-emptybox">
          <b>No matches for “{q}”</b>
          <button className="btn btn--sm btn--ghost" onClick={() => setQ('')}>
            Clear search
          </button>
        </div>
      ) : (
        <div className="adm-table__scroll scroll">
          <table>
            <thead>
              <tr>
                {columns.map((c) => (
                  <th key={c.key} style={{ width: c.width }} className={c.hideSm ? 'adm-hide-sm' : ''} aria-sort={sort.key === c.key ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}>
                    <button onClick={() => toggleSort(c.key)}>
                      {c.label}
                      <span className="adm-sort" aria-hidden>
                        {sort.key === c.key ? (sort.dir === 'asc' ? '▲' : '▼') : '↕'}
                      </span>
                    </button>
                  </th>
                ))}
                <th className="adm-table__act">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {slice.map((r, i) => (
                <tr key={rowKey(r, i)} onClick={() => setOpen(r)} className={open && open === r ? 'is-open' : ''}>
                  {columns.map((c) => (
                    <td key={c.key} className={`${c.mono ? 't-mono' : ''} ${c.hideSm ? 'adm-hide-sm' : ''}`}>
                      {c.render ? c.render(r) : c.key === 'createdAt' ? <time title={fmtTime(ts(r))}>{fmtAgo(ts(r))}</time> : <span className="adm-clip">{cell(r[c.key]) || <span className="t-muted">—</span>}</span>}
                    </td>
                  ))}
                  <td className="adm-table__act" onClick={(e) => e.stopPropagation()}>
                    <button className="adm-iconbtn" onClick={() => setOpen(r)} aria-label={`Open ${noun.one} details`}>
                      <Icon name="arrow-right" size={14} />
                    </button>
                    {canDelete && onDelete && r.id && (
                      <button className="adm-iconbtn adm-iconbtn--danger" onClick={() => setConfirm(r)} aria-label={`Delete ${noun.one}`}>
                        <Icon name="close" size={14} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pages > 1 && (
        <nav className="adm-pager" aria-label="Pages">
          <button className="btn btn--sm btn--icon" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0} aria-label="Previous page">
            <Icon name="arrow-left" size={14} />
          </button>
          <span className="t-label">
            {page * PAGE + 1}–{Math.min(filtered.length, page * PAGE + PAGE)} of {filtered.length.toLocaleString('en-US')}
          </span>
          <button className="btn btn--sm btn--icon" onClick={() => setPage((p) => Math.min(pages - 1, p + 1))} disabled={page >= pages - 1} aria-label="Next page">
            <Icon name="arrow-right" size={14} />
          </button>
        </nav>
      )}

      {open && <Drawer rec={open} name={noun.one} onClose={() => setOpen(null)} onDelete={canDelete && onDelete && open.id ? () => setConfirm(open) : undefined} />}
      {confirm && (
        <ConfirmDialog
          title={`Delete this ${noun.one}?`}
          body={`${recordTitle(confirm)} will be removed for good. This can’t be undone.`}
          busy={busy}
          onCancel={() => setConfirm(null)}
          onConfirm={() => doDelete(confirm)}
        />
      )}
    </div>
  );
}

/** A short human title for any record. */
export function recordTitle(r: Record_): string {
  const q = cell(r.question);
  return cell(r.name) || cell(r.email) || (q ? `“${q.length > 60 ? q.slice(0, 57) + '…' : q}”` : '') || cell(r.type) || r.id;
}

/* ------------------------------------------------------------------ drawer */
export function Drawer({ rec, name, onClose, onDelete }: { rec: Record_; name: string; onClose: () => void; onDelete?: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    closeRef.current?.focus();
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [onClose]);
  const email = typeof rec.email === 'string' && rec.email ? rec.email : '';
  const entries = Object.entries(rec).sort(([a], [b]) => (a === 'id' ? -1 : b === 'id' ? 1 : 0));
  return (
    <div className="adm-drawer-wrap" onPointerDown={(e) => e.target === e.currentTarget && onClose()}>
      <aside className="adm-drawer surface" role="dialog" aria-modal="true" aria-label={`${name} record details`}>
        <header className="adm-drawer__head">
          <div>
            <span className="t-label">
              <b className="t-primary">{name}</b> · {fmtTime(ts(rec))}
            </span>
            <h3>{recordTitle(rec)}</h3>
          </div>
          <button ref={closeRef} className="btn btn--sm btn--icon" onClick={onClose} aria-label="Close details">
            <Icon name="close" size={16} />
          </button>
        </header>
        <dl className="adm-drawer__body scroll">
          {entries.map(([k, v]) => (
            <div key={k}>
              <dt className="t-label">{k}</dt>
              <dd>
                {k === 'createdAt' || k === 'updatedAt' || k === 't' ? (
                  <>
                    {fmtTime(Number(v))} <span className="t-muted">· {String(v)}</span>
                  </>
                ) : typeof v === 'object' && v !== null ? (
                  <pre>{JSON.stringify(v, null, 2)}</pre>
                ) : (
                  String(v ?? '')
                )}
              </dd>
            </div>
          ))}
        </dl>
        <footer className="adm-drawer__foot">
          {email && (
            <a className="btn btn--sm btn--primary" href={`mailto:${email}`}>
              <Icon name="mail" size={14} /> Email
            </a>
          )}
          <button
            className="btn btn--sm"
            onClick={() => {
              navigator.clipboard?.writeText(JSON.stringify(rec, null, 2)).then(() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              });
            }}
          >
            <Icon name={copied ? 'check' : 'notebook'} size={14} /> {copied ? 'Copied' : 'Copy JSON'}
          </button>
          {onDelete && (
            <button className="btn btn--sm btn--ghost adm-danger" onClick={onDelete}>
              <Icon name="close" size={14} /> Delete
            </button>
          )}
        </footer>
      </aside>
    </div>
  );
}

/* ------------------------------------------------------------------ confirm */
export function ConfirmDialog({ title, body, onCancel, onConfirm, busy, confirmLabel = 'Delete' }: { title: string; body: string; onCancel: () => void; onConfirm: () => void; busy?: boolean; confirmLabel?: string }) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    cancelRef.current?.focus();
    const k = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onCancel();
      }
    };
    window.addEventListener('keydown', k, true);
    return () => window.removeEventListener('keydown', k, true);
  }, [onCancel]);
  return (
    <div className="adm-modal-wrap" onPointerDown={(e) => e.target === e.currentTarget && onCancel()}>
      <div className="adm-modal surface" role="alertdialog" aria-modal="true" aria-labelledby="adm-confirm-t" aria-describedby="adm-confirm-b">
        <span className="led led--blink" />
        <h3 id="adm-confirm-t">{title}</h3>
        <p id="adm-confirm-b">{body}</p>
        <div className="adm-modal__actions">
          <button ref={cancelRef} className="btn btn--sm" onClick={onCancel}>
            Cancel
          </button>
          <button className="btn btn--sm btn--dark adm-danger-solid" onClick={onConfirm} disabled={busy}>
            {busy ? 'Working…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
