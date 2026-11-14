'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { prefersReduced } from '@/components/fx/Motion';
import { Icon } from '@/components/ui/Icon';
import type { LkPaper } from '@/lib/content/loksewa';

type Level = 'papers' | 'subjects' | 'folders';

const RING = 260;

/**
 * SyllabusExplorer — the whole house as a navigable 3D assembly.
 *
 * Papers hang on a ring in real depth; opening one folds the ring away and
 * fans its subjects out; opening a subject raises its folders as slabs.
 * Titles are always real links, so the assembly works before hydration, with
 * the keyboard, and under reduced motion — where it flattens into a grid.
 */
export function SyllabusExplorer({ papers, allMarks }: { papers: LkPaper[]; allMarks: number }) {
  const [level, setLevel] = useState<Level>('papers');
  const [paperIx, setPaperIx] = useState(0);
  const [subjIx, setSubjIx] = useState(0);
  const [spin, setSpin] = useState(0);
  const [live, setLive] = useState(false);
  const stage = useRef<HTMLDivElement | null>(null);
  const drag = useRef({ x: 0, on: false });

  const paper = papers[paperIx] ?? papers[0];
  const subject = paper.subjects[Math.min(subjIx, paper.subjects.length - 1)];

  useEffect(() => {
    setLive(!prefersReduced());
  }, []);

  const onDown = useCallback(
    (e: React.PointerEvent) => {
      if (!live || level !== 'papers') return;
      drag.current = { x: e.clientX, on: true };
    },
    [level, live],
  );
  const onMove = useCallback(
    (e: React.PointerEvent) => {
      if (!live || !drag.current.on || level !== 'papers') return;
      const dx = e.clientX - drag.current.x;
      drag.current.x = e.clientX;
      setSpin((s) => s + dx * 0.4);
    },
    [level, live],
  );
  const onUp = useCallback(() => {
    drag.current.on = false;
  }, []);

  useEffect(() => {
    const el = stage.current;
    if (!el) return;
    const key = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') setSpin((s) => s - 30);
      else if (e.key === 'ArrowRight') setSpin((s) => s + 30);
      else if (e.key === 'Escape' && level === 'folders') setLevel('subjects');
      else if (e.key === 'Escape' && level === 'subjects') setLevel('papers');
      else return;
      e.preventDefault();
    };
    el.addEventListener('keydown', key);
    return () => el.removeEventListener('keydown', key);
  }, [level]);

  return (
    <div
      className="lx"
      ref={stage}
      data-level={level}
      data-live={live ? '1' : '0'}
      tabIndex={0}
      role="group"
      aria-label="पाठ्यक्रम ३डी एक्सप्लोरर — syllabus explorer"
    >
      <div className="lx-chrome">
        <div className="lx-path" aria-live="polite">
          <button type="button" className={level === 'papers' ? 'on' : ''} onClick={() => setLevel('papers')}>
            चार पेपर
          </button>
          {level !== 'papers' ? (
            <>
              <Icon name="arrow" size={11} />
              <button type="button" className={level === 'subjects' ? 'on' : ''} onClick={() => setLevel('subjects')}>
                {paper.title.ne}
              </button>
            </>
          ) : null}
          {level === 'folders' ? (
            <>
              <Icon name="arrow" size={11} />
              <span className="on">{subject.title.ne}</span>
            </>
          ) : null}
        </div>
        <p className="lx-hint mono">
          <span className="lx-chip">{allMarks} अङ्क</span>
          {level === 'papers' ? (live ? 'drag · ← → · click' : 'flat view') : 'Esc — पछाडि'}
        </p>
      </div>

      <div className="lx-scene" onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerLeave={onUp}>
        <div className="lx-world" style={{ transform: `rotateX(${live ? -14 : 0}deg) rotateY(${level === 'papers' ? spin : 0}deg)` }}>
          {level === 'papers' ? (
            <div className="lx-ring">
              {papers.map((p, i) => {
                const a = (360 / papers.length) * i;
                return (
                  <div
                    key={p.slug}
                    className="lx-node"
                    style={{ '--c': p.color, transform: `rotateY(${a}deg) translateZ(${RING}px)` } as React.CSSProperties}
                  >
                    <div className="lx-face" style={{ transform: `rotateY(${-(a + spin)}deg)` }}>
                      <span className="lx-node-num mono">०{i + 1}</span>
                      <Link className="lx-node-t" href={`/loksewa/${p.slug}`}>
                        {p.title.ne}
                      </Link>
                      <span className="lx-node-en">{p.title.en}</span>
                      <span className="lx-node-m">
                        {p.subjects.length} विषय · {p.subjects.reduce((s, x) => s + x.units.length, 0)} फोल्डर
                      </span>
                      <button
                        type="button"
                        className="lx-open"
                        onClick={() => {
                          setPaperIx(i);
                          setSubjIx(0);
                          setLevel('subjects');
                        }}
                      >
                        भित्र पस्नुहोस् <Icon name="arrow" size={12} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : null}

          {level === 'subjects' ? (
            <div className="lx-fan" style={{ '--c': paper.color, '--n': paper.subjects.length } as React.CSSProperties}>
              {paper.subjects.map((s, i) => {
                const mid = (paper.subjects.length - 1) / 2;
                return (
                  <div
                    key={s.slug}
                    className="lx-plate"
                    style={
                      {
                        '--i': i,
                        transform: `translate3d(0, 0, ${-Math.abs(i - mid) * 46}px) rotateY(${(i - mid) * -7}deg)`,
                      } as React.CSSProperties
                    }
                  >
                    <span className="lx-plate-num mono">{String(i + 1).padStart(2, '0')}</span>
                    <Link className="lx-plate-t" href={`/loksewa/${paper.slug}/${s.slug}`}>
                      {s.title.ne}
                    </Link>
                    <span className="lx-plate-en">{s.title.en}</span>
                    <span className="lx-plate-m">
                      {s.units.length} फोल्डर · {s.units.reduce((a, u) => a + u.points.length, 0)} बुँदा
                    </span>
                    <button
                      type="button"
                      className="lx-open"
                      onClick={() => {
                        setSubjIx(i);
                        setLevel('folders');
                      }}
                    >
                      फोल्डर खोल्नुहोस्
                    </button>
                  </div>
                );
              })}
            </div>
          ) : null}

          {level === 'folders' ? (
            <div className="lx-stack" style={{ '--c': paper.color, '--n': subject.units.length } as React.CSSProperties}>
              {subject.units.map((u, i) => (
                <div
                  key={u.slug}
                  className="lx-slab"
                  style={{ '--i': i, transform: `translate3d(0, 0, ${-i * 26}px) rotateX(${live ? 6 : 0}deg)` } as React.CSSProperties}
                >
                  <span className="lx-slab-num mono">{String(i + 1).padStart(2, '0')}</span>
                  <div className="lx-slab-body">
                    <Link className="lx-slab-t" href={`/loksewa/${paper.slug}/${subject.slug}`}>
                      {u.title.ne}
                    </Link>
                    <em className="lx-slab-en">{u.title.en}</em>
                    <ul className="lx-slab-pts">
                      {u.points.map((pt, k) => (
                        <li key={k}>{pt}</li>
                      ))}
                    </ul>
                  </div>
                  <span className="lx-slab-side">
                    <Link href={`/loksewa/print/${paper.slug}`}>
                      <Icon name="doc" size={12} /> PDF
                    </Link>
                  </span>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      <div className="lx-actions">
        {level === 'papers' ? (
          <Link className="btn btn-p btn-sm" href="/loksewa/downloads">
            <Icon name="down" size={14} /> सबै नक्सा डाउनलोड
          </Link>
        ) : (
          <button
            className="btn btn-g btn-sm"
            type="button"
            onClick={() => setLevel(level === 'folders' ? 'subjects' : 'papers')}
          >
            <Icon name="arrow" size={14} /> माथि फर्कनुहोस्
          </button>
        )}
        {level === 'papers' ? (
          <Link className="btn btn-sm" href="/loksewa/print/full">
            <Icon name="doc" size={14} /> सम्पूर्ण पाठ्यक्रम नक्सा
          </Link>
        ) : (
          <Link className="btn btn-sm" href={`/loksewa/print/${paper.slug}`}>
            <Icon name="doc" size={14} /> {paper.title.ne} — PDF
          </Link>
        )}
      </div>
    </div>
  );
}
