import type { ReactNode } from 'react';

/**
 * The case study's data table: a caption, column headers, a row header per row, scrolls sideways
 * on phones (as a focusable region, so it scrolls from the keyboard too). `chosen` marks the row
 * that shipped; `wrap` lists the columns that may wrap instead of staying on one line.
 */
export function Table({
  caption,
  head,
  rows,
  chosen,
  chosenTag = 'Shipped',
  wrap = [],
  compact = false,
  muted = [],
}: {
  caption: ReactNode;
  head: ReactNode[];
  rows: ReactNode[][];
  chosen?: number;
  chosenTag?: string;
  wrap?: number[];
  compact?: boolean;
  muted?: number[];
}) {
  return (
    <div className={`case-table ${compact ? 'case-table--compact' : ''}`} role="region" aria-label={typeof caption === 'string' ? caption : 'Table'} tabIndex={0}>
      <table>
        <caption>{caption}</caption>
        <thead>
          <tr>
            {head.map((h, j) => (
              <th key={j} scope="col">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, k) => (
            <tr key={k} data-chosen={k === chosen || undefined}>
              {row.map((cell, j) => {
                const cls = [wrap.includes(j) ? 'case-table__wrap' : '', muted.includes(j) ? 't-muted' : ''].filter(Boolean).join(' ') || undefined;
                return j === 0 ? (
                  <th key={j} scope="row" className={cls}>
                    {cell}
                    {k === chosen && chosenTag && <span className="case-table__pick">{chosenTag}</span>}
                  </th>
                ) : (
                  <td key={j} className={cls}>
                    {cell}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
