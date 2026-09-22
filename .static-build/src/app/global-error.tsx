'use client';

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en" data-theme="dark">
      <body style={{ margin: 0, background: '#05060c', color: '#e8eeff', fontFamily: 'system-ui, sans-serif' }}>
        <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24, textAlign: 'center' }}>
          <div style={{ maxWidth: 520 }}>
            <div style={{ fontFamily: 'monospace', fontSize: 11, letterSpacing: '0.3em', color: '#ff5f7a', marginBottom: 18 }}>
              CRITICAL ERROR
            </div>
            <h1 style={{ fontSize: 'clamp(1.8rem,5vw,2.6rem)', fontWeight: 700, letterSpacing: '-0.03em', margin: '0 0 14px' }}>
              The world went dark
            </h1>
            <p style={{ color: '#93a0c4', fontSize: 14, lineHeight: 1.7, marginBottom: 28 }}>
              A critical error occurred. Please reload — if the problem persists, contact us at
              thesynresearch@gmail.com or 9802336200.
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
              <button onClick={reset}
                style={{ padding: '13px 24px', borderRadius: 999, border: 0, fontWeight: 600, fontSize: 14, cursor: 'pointer', background: 'linear-gradient(100deg,#35e0ff 0%,#7c5cff 55%,#ff4ecd 125%)', color: '#04060e' }}>
                Try again
              </button>
              <button onClick={() => window.location.reload()}
                style={{ padding: '13px 24px', borderRadius: 999, border: '1px solid rgba(140,170,255,.3)', background: 'rgba(8,11,22,.92)', color: '#e8eeff', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>
                Reload page
              </button>
            </div>
          </div>
        </main>
      </body>
    </html>
  );
}
