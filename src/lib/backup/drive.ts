import 'server-only';
import { SignJWT } from 'jose';

/**
 * Google Drive backup adapter (spec §77–80).
 * Private ACTTOLOG Drive folder · weekly cadence · indefinite retention ·
 * never auto-deleted · safety backup before restore.
 *
 * Auth: service-account JWT (RS256) signed with jose — no extra deps.
 * Without credentials every call reports `not_configured` honestly.
 */

const SCOPE = 'https://www.googleapis.com/auth/drive.file';

export const driveConfigured = (): boolean =>
  Boolean(process.env.GOOGLE_DRIVE_CLIENT_EMAIL && process.env.GOOGLE_DRIVE_PRIVATE_KEY);

async function accessToken(): Promise<string> {
  const keyPem = (process.env.GOOGLE_DRIVE_PRIVATE_KEY || '').replace(/\\n/g, '\n');
  const assertion = await new SignJWT({ scope: SCOPE })
    .setProtectedHeader({ alg: 'RS256' })
    .setIssuer(process.env.GOOGLE_DRIVE_CLIENT_EMAIL!)
    .setSubject(process.env.GOOGLE_DRIVE_CLIENT_EMAIL!)
    .setAudience('https://oauth2.googleapis.com/token')
    .setIssuedAt()
    .setExpirationTime('5m')
    .sign(await import('node:crypto').then((c) => c.createPrivateKey(keyPem)));
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion }),
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`drive token exchange failed: ${res.status}`);
  const j = await res.json();
  return j.access_token as string;
}

async function driveFetch(path: string, init: RequestInit = {}, upload = false) {
  const token = await accessToken();
  const base = upload ? 'https://www.googleapis.com/upload/drive/v3' : 'https://www.googleapis.com/drive/v3';
  return fetch(`${base}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, ...(init.headers || {}) },
    cache: 'no-store',
  });
}

/** Ensure the ACTTOLOG/Backups/<kind> folder chain exists; returns leaf id. */
export async function ensureBackupFolder(kind: string): Promise<string> {
  const rootName = 'ACTTOLOG';
  const find = async (name: string, parent?: string) => {
    const q = `name='${name}' and mimeType='application/vnd.google-apps.folder' and trashed=false${parent ? ` and '${parent}' in parents` : ''}`;
    const res = await driveFetch(`/files?q=${encodeURIComponent(q)}&fields=files(id,name)`);
    const j = await res.json();
    return j.files?.[0]?.id as string | undefined;
  };
  const create = async (name: string, parent?: string) => {
    const res = await driveFetch('/files', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, mimeType: 'application/vnd.google-apps.folder', ...(parent ? { parents: [parent] } : {}) }),
    });
    const j = await res.json();
    return j.id as string;
  };
  let root = await find(rootName);
  root = root || (await create(rootName));
  let backups = await find('Backups', root);
  backups = backups || (await create('Backups', root));
  let leaf = await find(kind, backups);
  leaf = leaf || (await create(kind, backups));
  return leaf;
}

/** Upload a JSON dump as a Drive file. Returns { id, name }. */
export async function uploadBackup(kind: string, name: string, payload: unknown): Promise<{ id: string; name: string }> {
  const folder = await ensureBackupFolder(kind);
  const body = JSON.stringify(payload);
  const res = await driveFetch(
    `/files?uploadType=multipart`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'multipart/related; boundary=atl' },
      body:
        `--atl\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n` +
        JSON.stringify({ name, parents: [folder] }) +
        `\r\n--atl\r\nContent-Type: application/json\r\n\r\n` + body + `\r\n--atl--`,
    },
    true,
  );
  if (!res.ok) throw new Error(`drive upload failed: ${res.status}`);
  const j = await res.json();
  return { id: j.id, name: j.name };
}

/** List backups of a kind (newest first). Never deletes — retention indefinite. */
export async function listBackups(kind: string): Promise<{ id: string; name: string; createdTime: string; size: string }[]> {
  const folder = await ensureBackupFolder(kind);
  const res = await driveFetch(
    `/files?q=${encodeURIComponent(`'${folder}' in parents and trashed=false`)}&fields=files(id,name,createdTime,size)&orderBy=createdTime desc`,
  );
  const j = await res.json();
  return j.files || [];
}

/** Download a backup payload (for restore flows). */
export async function downloadBackup(fileId: string): Promise<unknown> {
  const res = await driveFetch(`/files/${fileId}?alt=media`);
  if (!res.ok) throw new Error(`drive download failed: ${res.status}`);
  return res.json();
}
