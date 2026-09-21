'use client';
import { useEffect, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { fktm } from '@/lib/utils';

interface U { id: string; name: string; email: string; role: string; status: string; createdAt: string; lastLoginAt?: string | null; deletionRequestedAt?: string | null }

export function UsersClient() {
  const [users, setUsers] = useState<U[] | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    fetch('/api/admin/users').then(async (r) => {
      if (!r.ok) { const d = await r.json().catch(() => ({})); setError(d.error === 'not_configured' ? 'not_configured' : 'error'); return null; }
      return r.json();
    }).then((d) => { if (d) setUsers(d.users); }).catch(() => setError('error'));
  }, []);

  if (error === 'not_configured')
    return <div className="panel p-10 text-center mut">The user registry persists to PostgreSQL — connect the database to see members. Sign-in itself works statelessly via secure session cookies.</div>;
  if (error) return <div className="panel p-10 text-center mut">Could not load users.</div>;
  if (!users) return <div className="panel p-10 text-center dim mono text-[11px] tracking-[.2em]">LOADING…</div>;
  if (!users.length) return <div className="panel p-10 text-center mut">No members yet.</div>;

  return (
    <div className="panel overflow-hidden">
      <table className="tbl">
        <thead><tr><th>Member</th><th>Role</th><th>Status</th><th>Joined (NPT)</th><th>Last login</th><th>Flags</th></tr></thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id}>
              <td><div className="font-medium" style={{ color: 'var(--txt)' }}>{u.name}</div><div className="dim mono text-[10.4px]">{u.email}</div></td>
              <td><span className={`badge ${u.role === 'OWNER' ? 'b-info' : u.role === 'ADMIN' ? 'b-vi' : 'b-mut'}`}>{u.role}</span></td>
              <td>{u.status}</td>
              <td className="mono text-[11px]">{fktm(u.createdAt)}</td>
              <td className="mono text-[11px]">{u.lastLoginAt ? fktm(u.lastLoginAt) : '—'}</td>
              <td>{u.deletionRequestedAt ? <span className="badge b-err"><Icon name="trash" size={10} />deletion requested</span> : <span className="dim">—</span>}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
