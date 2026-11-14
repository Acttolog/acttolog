'use client';

import { useEffect, useLayoutEffect, useRef, type ReactNode, type RefObject } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

/**
 * FX scene — the seven 3D image treatments accepted in review, wired by
 * data attribute so no wrapper elements are added to the existing cards.
 *
 *   data-fx="tilt"   01  plate leans toward the pointer, sheen tracks it
 *   data-fx="flip"   02  scroll-scrubbed rotateY through space
 *   data-fx="scan"   07  cyan scan bar wipes the image into view
 *   data-plane="n"   03  this layer scrolls at n x the scene speed
 *   class fx-holo    05  orbiting brand-gradient rim + light sweep (CSS)
 *   class fx-kb      04  Ken Burns Z drift + breathing vignette (CSS)
 *
 * Nothing is pre-hidden in markup: a crawler, a no-JS visitor, or a
 * reduced-motion request all receive the finished image. Handlers are removed
 * and tweens reverted on unmount.
 */

const useIsoLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

let registered = false;
function register() {
  if (registered) return;
  gsap.registerPlugin(ScrollTrigger);
  registered = true;
}

export function prefersReduced(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** Sets <html class="fx-on"> only while motion is allowed, gating the CSS treatments. */
export function useMotionArm(): void {
  useEffect(() => {
    register();
    const root = document.documentElement;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const apply = () => root.classList.toggle('fx-on', !mq.matches);
    apply();
    mq.addEventListener('change', apply);
    return () => {
      mq.removeEventListener('change', apply);
      root.classList.remove('fx-on');
    };
  }, []);
}

/** Wires every fx element inside `root` for as long as it is mounted. */
export function useFxScene<T extends HTMLElement>(root: RefObject<T | null>): void {
  useIsoLayoutEffect(() => {
    const host = root.current;
    if (!host || prefersReduced()) return;
    register();
    const cleanups: (() => void)[] = [];
    /** Reveals that must never be left half-done: force them if they are on screen. */
    const reveals: { el: HTMLElement; done: () => void }[] = [];

    // 01 pointer tilt
    host.querySelectorAll<HTMLElement>('[data-fx~="tilt"]').forEach((el) => {
      el.classList.add('fx-tilt');
      gsap.set(el, { transformPerspective: 900 });
      const xTo = gsap.quickTo(el, 'rotationY', { duration: 0.5, ease: 'power3.out' });
      const yTo = gsap.quickTo(el, 'rotationX', { duration: 0.5, ease: 'power3.out' });
      const zTo = gsap.quickTo(el, 'z', { duration: 0.5, ease: 'power3.out' });
      const move = (e: PointerEvent) => {
        const r = el.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5;
        const py = (e.clientY - r.top) / r.height - 0.5;
        xTo(px * 22);
        yTo(-py * 17);
        zTo(18);
        el.style.setProperty('--fx-mx', `${(px + 0.5) * 100}%`);
        el.style.setProperty('--fx-my', `${(py + 0.5) * 100}%`);
      };
      const leave = () => {
        xTo(0);
        yTo(0);
        zTo(0);
      };
      el.addEventListener('pointermove', move);
      el.addEventListener('pointerleave', leave);
      cleanups.push(() => {
        el.removeEventListener('pointermove', move);
        el.removeEventListener('pointerleave', leave);
        gsap.killTweensOf(el);
      });
    });

    // 02 scroll-scrubbed flip — rotation and depth only. Reveal already owns the
    // wrapper's opacity, and two writers on one property leaves content faded.
    host.querySelectorAll<HTMLElement>('[data-fx~="flip"]').forEach((el) => {
      if (el.getBoundingClientRect().top < window.innerHeight * 0.9) return;
      const ctx = gsap.context(() => {
        const tween = gsap.fromTo(
          el,
          { rotationY: -24, z: -110, transformPerspective: 1100 },
          {
            rotationY: 24,
            z: 0,
            transformPerspective: 1100,
            ease: 'none',
            scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: 0.6 },
          },
        );
        reveals.push({ el, done: () => tween.progress(1) });
      });
      cleanups.push(() => ctx.revert());
    });

    // 07 scanline reveal — one-shot, so it is driven by IntersectionObserver,
    // the same mechanism the site's own reveals already use.
    host.querySelectorAll<HTMLElement>('[data-fx~="scan"]').forEach((el) => {
      const img = el.querySelector('img');
      if (!img) return;
      if (el.getBoundingClientRect().top < window.innerHeight * 0.9) return;
      el.classList.add('fx-scan');
      const bar = document.createElement('span');
      bar.className = 'fx-scan-bar';
      bar.setAttribute('aria-hidden', 'true');
      el.appendChild(bar);
      gsap.set(img, { clipPath: 'inset(0 0 100% 0)' });
      let tl: gsap.core.Tween | null = null;
      const io = new IntersectionObserver(
        (entries) => {
          entries.forEach((e) => {
            if (!e.isIntersecting) return;
            io.unobserve(e.target);
            tl = gsap.to(img, { clipPath: 'inset(0 0 0% 0)', duration: 1.05, ease: 'power2.inOut' });
            gsap.fromTo(bar, { opacity: 1, top: '-2%' }, { opacity: 0, top: '102%', duration: 1.05, ease: 'power2.inOut' });
          });
        },
        { threshold: 0.12, rootMargin: '0px 0px -8% 0px' },
      );
      io.observe(el);
      // Registered now, not inside the observer: a fast scroll can jump past an
      // element between two IO samples, and then nothing would ever unhide it.
      reveals.push({
        el,
        done: () => {
          io.disconnect();
          if (tl) tl.progress(1);
          else gsap.set(img, { clearProps: 'clipPath' });
        },
      });
      cleanups.push(() => {
        io.disconnect();
        gsap.set(img, { clearProps: 'clipPath' });
        bar.remove();
      });
    });

    // 03 dimensional planes
    host.querySelectorAll<HTMLElement>('[data-plane]').forEach((plane) => {
      const speed = Number(plane.dataset.plane) || 0;
      if (!speed) return;
      plane.classList.add('fx-plane');
      const ctx = gsap.context(() => {
        gsap.fromTo(
          plane,
          { yPercent: -9 * speed },
          {
            yPercent: 9 * speed,
            ease: 'none',
            scrollTrigger: { trigger: host, start: 'top bottom', end: 'bottom top', scrub: true },
          },
        );
      });
      cleanups.push(() => ctx.revert());
    });

    // The globe, the lazy art and the webfonts all change page height after these
    // triggers are measured, and window.load may already have fired by the time
    // this effect runs. So visibility cannot depend on ScrollTrigger being right:
    // any reveal that is on screen gets completed outright, on every scroll frame.
    const sweep = () => {
      for (let i = reveals.length - 1; i >= 0; i -= 1) {
        const { el, done } = reveals[i];
        // Anything at or above the fold line has already been the visitor's to
        // see — including what they scrolled straight past. Only items still
        // below it may remain armed.
        if (el.getBoundingClientRect().top >= window.innerHeight * 0.92) continue;
        done();
        reveals.splice(i, 1);
      }
    };
    let queued = false;
    const onScroll = () => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(() => {
        queued = false;
        sweep();
      });
    };
    const settle = () => {
      ScrollTrigger.refresh();
      sweep();
    };
    const raf = requestAnimationFrame(settle);
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('load', settle, { once: true });
    const timer = window.setTimeout(settle, 1200);

    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(timer);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('load', settle);
      cleanups.forEach((fn) => fn());
    };
  }, [root]);
}

/** Convenience for a section that owns its own ref. */
export function useFx<T extends HTMLElement>(): [RefObject<T | null>, () => void] {
  const ref = useRef<T | null>(null);
  useFxScene(ref);
  return [ref, () => ScrollTrigger.refresh()];
}

/**
 * Controller for markup that a server component renders — e.g. the Nepal band,
 * whose images come from the filesystem. Mark children with data-fx / data-plane
 * and this picks them up without adding any layout wrapper of its own.
 */
export function FxScene({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement | null>(null);
  useFxScene(ref);
  return <div ref={ref}>{children}</div>;
}
