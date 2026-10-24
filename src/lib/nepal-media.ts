import fs from 'node:fs';
import path from 'node:path';

/**
 * Nepal media scanner — server-side, runs at build/render time.
 *
 * Files are named `<slug>-<width>.<ext>` (480/1024/1600, avif + jpg). A content
 * record's `image` field is the expected slug stem; if no file matches, the
 * caller falls back to procedural art. That makes the data file declarative:
 * drop `pashupatinath-1024.jpg` into public/media/nepal and it appears, with no
 * code change and no broken-image state in the meantime.
 */

export const NEPAL_MEDIA_DIR = path.join(process.cwd(), 'public', 'media', 'nepal');
export const SHOT_WIDTHS = [480, 1024, 1600] as const;

export interface ShotSource {
  base: string;
  has: number[];
  hasAvif: boolean;
}

const FILE_RE = /^(.+)-(480|1024|1600)\.(avif|jpe?g|webp|png)$/i;

export function readMediaFiles(dir = NEPAL_MEDIA_DIR): string[] {
  try {
    return fs.readdirSync(dir).filter((f) => {
      try { return fs.statSync(path.join(dir, f)).isFile(); } catch { return false; }
    });
  } catch {
    return [];
  }
}

/** base slug → the widths and formats actually on disk, smallest first. */
export function scanShots(files: string[]): Record<string, ShotSource> {
  const map: Record<string, ShotSource> = {};
  for (const f of files) {
    const m = FILE_RE.exec(f);
    if (!m) continue;
    const [, base, width, extRaw] = m;
    const w = Number(width);
    const ext = extRaw.toLowerCase();
    const entry = (map[base] ||= { base, has: [], hasAvif: false });
    if (!entry.has.includes(w)) entry.has.push(w);
    if (ext === 'avif') entry.hasAvif = true;
  }
  for (const s of Object.values(map)) s.has.sort((a, b) => a - b);
  return map;
}

/** Resolve a content `image` value ("nepal/everest-pano") to a ShotSource. */
export function shotFor(image: string | undefined, shots: Record<string, ShotSource>): ShotSource | null {
  if (!image) return null;
  return shots[image.replace(/^nepal\//, '')] || null;
}

/** True if any real photo exists for this slug — used to label procedural art. */
export const hasPhoto = (s: ShotSource | null): boolean => Boolean(s && s.has.length);
