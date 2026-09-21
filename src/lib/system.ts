import 'server-only';

/**
 * System health & integration registry (spec §89).
 * Statuses are computed from real environment state — never faked:
 * Healthy · Warning · Error · Not Configured.
 */

export type Health = 'healthy' | 'warning' | 'error' | 'not_configured';

export interface IntegrationRow {
  key: string;
  label: string;
  status: Health;
  note: string;
}

export function integrationStatus(): IntegrationRow[] {
  const has = (v: string | undefined) => Boolean(v && v.trim());

  const database: IntegrationRow = {
    key: 'database',
    label: 'PostgreSQL / Supabase',
    status: has(process.env.DATABASE_URL) ? 'healthy' : 'not_configured',
    note: has(process.env.DATABASE_URL)
      ? 'DATABASE_URL is set — CMS, analytics and auth records persist.'
      : 'Requires DATABASE_URL. Until connected the site serves bundled seed content and write-paths report honest "not configured" states.',
  };

  const oauth: IntegrationRow = {
    key: 'googleOAuth',
    label: 'Google OAuth',
    status: has(process.env.GOOGLE_CLIENT_ID) && has(process.env.GOOGLE_CLIENT_SECRET) ? 'healthy'
      : has(process.env.GOOGLE_CLIENT_ID) ? 'warning' : 'not_configured',
    note: 'Requires GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET; ID tokens are verified server-side via Google JWKS.',
  };

  const openai: IntegrationRow = {
    key: 'openai',
    label: 'OpenAI (Acttolog AI)',
    status: has(process.env.OPENAI_API_KEY) ? 'healthy' : 'not_configured',
    note: has(process.env.OPENAI_API_KEY)
      ? 'AI answers are composed server-side with Acttolog-first grounding.'
      : 'Requires OPENAI_API_KEY (server-side only). Without it the assistant answers from the Acttolog content index and says so.',
  };

  const ga4: IntegrationRow = {
    key: 'ga4',
    label: 'Google Analytics 4',
    status: has(process.env.NEXT_PUBLIC_GA_ID) ? 'healthy' : 'not_configured',
    note: 'Inspect for an existing Acttolog property first — do not create duplicates. Loads only after analytics consent.',
  };

  const drive: IntegrationRow = {
    key: 'drive',
    label: 'Google Drive Backups',
    status: has(process.env.GOOGLE_DRIVE_CLIENT_EMAIL) && has(process.env.GOOGLE_DRIVE_PRIVATE_KEY) ? 'healthy' : 'not_configured',
    note: 'Weekly backups, indefinite retention, never auto-deleted. Requires a private service account scoped to the ACTTOLOG Drive folder.',
  };

  const storage: IntegrationRow = {
    key: 'storage',
    label: 'Object Storage (media)',
    status: has(process.env.S3_BUCKET) && has(process.env.S3_ACCESS_KEY) ? 'healthy' : 'not_configured',
    note: 'S3-compatible storage for the media library. Without it, uploads are disabled — no base64/localStorage media in production.',
  };

  const email: IntegrationRow = {
    key: 'email',
    label: 'Email Provider',
    status: has(process.env.SMTP_URL) ? 'healthy' : 'not_configured',
    note: 'Contact/notification delivery. Until connected, messages are stored server-side and the UI says so.',
  };

  const payments: IntegrationRow = {
    key: 'payment',
    label: 'Payments',
    status: has(process.env.PAYMENT_SECRET_KEY) ? 'warning' : 'not_configured',
    note: 'Modular gateway adapters; disabled until a provider is authorized. No payment is ever reported successful without provider verification.',
  };

  const authSecret: IntegrationRow = {
    key: 'authSecret',
    label: 'Session Signing (AUTH_SECRET)',
    status: has(process.env.AUTH_SECRET) ? 'healthy' : process.env.NODE_ENV === 'production' ? 'error' : 'warning',
    note: process.env.NODE_ENV === 'production' && !has(process.env.AUTH_SECRET)
      ? 'AUTH_SECRET must be set in production — sessions cannot be trusted without it.'
      : 'Signs httpOnly session cookies (HS256).',
  };

  const owner: IntegrationRow = {
    key: 'owner',
    label: 'Owner Role (OWNER_EMAIL)',
    status: has(process.env.OWNER_EMAIL) ? 'healthy' : 'warning',
    note: has(process.env.OWNER_EMAIL)
      ? 'Owner role is provisioned by environment — the email is never rendered publicly.'
      : 'Set OWNER_EMAIL so the Owner account resolves server-side at first sign-in.',
  };

  return [database, oauth, openai, ga4, drive, storage, email, payments, authSecret, owner];
}

/** Aggregate health for the dashboard header. */
export function overallHealth(rows: IntegrationRow[]): Health {
  if (rows.some((r) => r.status === 'error')) return 'error';
  if (rows.some((r) => r.status === 'warning')) return 'warning';
  if (rows.every((r) => r.status === 'healthy')) return 'healthy';
  return 'not_configured';
}
