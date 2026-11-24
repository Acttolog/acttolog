'use client';

import Link from 'next/link';
import { Logo } from '@/components/Logo';
import { GoogleButton } from '@/components/ui/GoogleButton';
import { Icon } from '@/components/ui/Icon';

/** Staff-only login — Google OAuth, Owner/Admin resolved server-side (spec §52). */
export function AdminLoginClient({ notStaff }: { notStaff: boolean }) {
  return (
    <section className="pt-[calc(var(--nav)+70px)] pb-24">
      <div className="wrap">
        <div className="panel mx-auto max-w-[560px] p-9 text-center sm:p-14">
          <div className="mb-6 flex justify-center">
            <Logo variant="icon" width={48} />
          </div>
          <div className="mono dim mb-3 text-[10.5px] tracking-[.3em]">PRIVATE AREA</div>
          <h1 className="h2 mb-3 !text-[clamp(1.5rem,3.4vw,2.2rem)]">Admin Console</h1>
          <p className="mut mx-auto mb-7 max-w-[46ch] text-[13.6px] leading-relaxed">
            Owner and Admin access only. Sign in with Google — roles are resolved server-side and the console
            never trusts client claims.
          </p>
          {notStaff && (
            <div
              className="mb-6 rounded-xl border p-4 text-left"
              style={{
                borderColor: 'color-mix(in srgb,var(--warn) 34%,transparent)',
                background: 'color-mix(in srgb,var(--warn) 7%,transparent)',
              }}
            >
              <div className="flex items-start gap-3">
                <span style={{ color: 'var(--warn)', flex: 'none', marginTop: 2 }}>
                  <Icon name="shield" size={16} />
                </span>
                <p className="mut text-[12.6px] leading-relaxed">
                  You are signed in, but this account does not hold an Owner/Admin role. Roles are granted by
                  the Owner via server configuration.
                </p>
              </div>
            </div>
          )}
          <GoogleButton returnTo="/admin/dashboard" className="mx-auto" label="Continue with Google" />
          <Link href="/" className="btn btn-g btn-sm mt-6">
            Back to the World
          </Link>
        </div>
      </div>
    </section>
  );
}
