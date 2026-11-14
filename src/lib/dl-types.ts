/**
 * Shared download-file types and formatting — safe on both sides of the
 * server/client boundary. The disk scan lives in dl.ts, which is server-only.
 */

export interface DlFile {
  name: string;
  path: string;
  bytes: number;
  kind: 'pdf' | 'pptx' | 'mp4' | 'jpg' | 'png' | 'other';
}

export function dlMb(bytes: number) {
  return bytes >= 1024 * 1024 ? `${(bytes / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

export const dlSum = (files: DlFile[]) => files.reduce((a, f) => a + f.bytes, 0);

export const dlKindLabel: Record<DlFile['kind'], string> = {
  pdf: 'PDF',
  pptx: 'PPTX',
  mp4: 'MP4',
  jpg: 'JPG',
  png: 'PNG',
  other: 'FILE',
};
