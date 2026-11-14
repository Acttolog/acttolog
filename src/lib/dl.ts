import 'server-only';
import { existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import type { DlFile } from './dl-types';

export type { DlFile } from './dl-types';
export { dlMb, dlSum, dlKindLabel } from './dl-types';

/**
 * The download catalogue is read from the files that actually exist on disk,
 * so a card can never claim a size, a format, or an item that was not built.
 * Generation lives in tools/lk-files.js, tools/lk-pptx.js and tools/lk-video.js.
 */

const DIR = join(process.cwd(), 'public', 'loksewa', 'dl');
// Paid material lives outside public/ on purpose: the Pages harvest copies
// public/ verbatim, so anything there is public. Sizes shown on the paid cards
// are measured from this folder, which only the build machine can read.
const PAID_DIR = join(process.cwd(), '.lk-paid');

const KIND: Record<string, DlFile['kind']> = { pdf: 'pdf', pptx: 'pptx', mp4: 'mp4', jpg: 'jpg', jpeg: 'jpg', png: 'png' };

export function dlFiles(): DlFile[] {
  if (!existsSync(DIR)) return [];
  return readdirSync(DIR)
    .filter((f) => !f.startsWith('.'))
    .map((f) => {
      const ext = f.includes('.') ? f.slice(f.lastIndexOf('.') + 1).toLowerCase() : '';
      return {
        name: f,
        path: `/loksewa/dl/${f}`,
        bytes: statSync(join(DIR, f)).size,
        kind: KIND[ext] ?? 'other',
      } as DlFile;
    })
    .filter((f) => f.kind !== 'other')
    .sort((a, b) => a.name.localeCompare(b.name));
}

export const dlFind = (name: string, files = dlFiles()) => files.find((f) => f.name === name) ?? null;

export const dlHas = (name: string, files = dlFiles()) => files.some((f) => f.name === name);

/** The paid decks: measured here, never linked, because they are not deployed. */
export function paidFiles(): DlFile[] {
  if (!existsSync(PAID_DIR)) return [];
  return readdirSync(PAID_DIR)
    .filter((f) => !f.startsWith('.'))
    .map((f) => {
      const ext = f.includes('.') ? f.slice(f.lastIndexOf('.') + 1).toLowerCase() : '';
      return { name: f, path: '', bytes: statSync(join(PAID_DIR, f)).size, kind: KIND[ext] ?? 'other' } as DlFile;
    })
    .filter((f) => f.kind !== 'other')
    .sort((a, b) => a.name.localeCompare(b.name));
}

export const paidFind = (name: string, files = paidFiles()) => files.find((f) => f.name === name) ?? null;

/** Total weight of everything offered, for the honest "how much data" line. */
export const dlTotal = (files = dlFiles()) => files.reduce((a, f) => a + f.bytes, 0);
