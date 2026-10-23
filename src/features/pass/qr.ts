/* QR-like 21×21 module grid, deterministic from a seed (decorative only). */
import { hash32 } from './lib';

export const QR_SIZE = 21;

export function qrCells(seed: string, n = QR_SIZE): boolean[][] {
  const grid: boolean[][] = Array.from({ length: n }, () => Array(n).fill(false));
  const reserved: boolean[][] = Array.from({ length: n }, () => Array(n).fill(false));
  const finder = (ox: number, oy: number) => {
    for (let y = -1; y <= 7; y++)
      for (let x = -1; x <= 7; x++) {
        const gx = ox + x;
        const gy = oy + y;
        if (gx < 0 || gy < 0 || gx >= n || gy >= n) continue;
        reserved[gy][gx] = true;
        const ring = x === 0 || x === 6 || y === 0 || y === 6;
        const core = x >= 2 && x <= 4 && y >= 2 && y <= 4;
        grid[gy][gx] = x >= 0 && x <= 6 && y >= 0 && y <= 6 && (ring || core);
      }
  };
  finder(0, 0);
  finder(n - 7, 0);
  finder(0, n - 7);
  for (let i = 8; i < n - 8; i++) {
    reserved[6][i] = reserved[i][6] = true;
    grid[6][i] = grid[i][6] = i % 2 === 0;
  }
  // small alignment square
  const a = n - 7;
  for (let y = -2; y <= 2; y++)
    for (let x = -2; x <= 2; x++) {
      reserved[a + y][a + x] = true;
      grid[a + y][a + x] = Math.max(Math.abs(x), Math.abs(y)) !== 1;
    }
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++) if (!reserved[y][x]) grid[y][x] = (hash32(`${seed}#${x},${y}`) & 7) < 4;
  return grid;
}

export function qrPath(seed: string): string {
  const g = qrCells(seed);
  let d = '';
  g.forEach((row, y) => row.forEach((on, x) => on && (d += `M${x} ${y}h1v1h-1z`)));
  return d;
}
