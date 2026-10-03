'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import * as THREE from 'three';
import { Icon } from '@/components/ui/Icon';
import { WORLDS_360 } from '@/lib/world/config';
import { track } from '@/lib/analytics';

/** Loads a generated equirectangular environment; null → procedural art. */
function loadPanoTexture(url: string, onDone: (tex: THREE.Texture | null) => void): void {
  const loader = new THREE.TextureLoader();
  loader.load(
    url,
    (tex) => { tex.colorSpace = THREE.SRGBColorSpace; tex.mapping = THREE.EquirectangularReflectionMapping; onDone(tex); },
    undefined,
    () => onDone(null), // missing/blocked asset → procedural fallback, never a broken screen
  );
}

/** Circular founder-guide sprite texture (real photo, owner-provided). */
function makeGuideTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas'); c.width = 256; c.height = 256;
  const x = c.getContext('2d')!;
  const ring = () => {
    x.lineWidth = 8; x.strokeStyle = 'rgba(53,224,255,.95)';
    x.beginPath(); x.arc(128, 116, 86, 0, Math.PI * 2); x.stroke();
    x.fillStyle = '#e8eeff'; x.font = '700 26px "JetBrains Mono", monospace'; x.textAlign = 'center';
    x.fillText('GUIDE', 128, 236);
  };
  const img = new Image();
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  img.onload = () => {
    x.save(); x.beginPath(); x.arc(128, 116, 82, 0, Math.PI * 2); x.clip();
    x.drawImage(img, 128 - 82, 116 - 82, 164, 164); x.restore(); ring();
    tex.needsUpdate = true;
  };
  img.onerror = () => { x.fillStyle = 'rgba(53,224,255,.25)'; x.beginPath(); x.arc(128, 116, 82, 0, Math.PI * 2); x.fill(); ring(); tex.needsUpdate = true; };
  img.src = '/media/founder-avatar.jpg';
  return tex;
}

/** Procedural equirectangular panorama for an ACTTOLOG-owned 360 world. */
function panoTexture(worldId: string, palette: readonly string[]): THREE.Texture {
  const W = 2048, H = 1024;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const x = c.getContext('2d')!;
  let s = 0;
  for (let i = 0; i < worldId.length; i++) s = (s * 31 + worldId.charCodeAt(i)) >>> 0;
  const rn = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };

  const sky = x.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, '#010208');
  sky.addColorStop(0.48, palette[0]);
  sky.addColorStop(0.52, palette[0]);
  sky.addColorStop(1, '#000000');
  x.fillStyle = sky; x.fillRect(0, 0, W, H);

  // horizon glow band
  const hg = x.createLinearGradient(0, H * 0.42, 0, H * 0.6);
  hg.addColorStop(0, 'transparent');
  hg.addColorStop(0.5, palette[1] + '55');
  hg.addColorStop(1, 'transparent');
  x.fillStyle = hg; x.fillRect(0, H * 0.42, W, H * 0.18);

  // floor grid (perspective suggestion)
  x.strokeStyle = palette[1] + '38'; x.lineWidth = 1.4;
  for (let i = 0; i <= 26; i++) {
    const y = H * 0.52 + (i / 26) ** 2 * H * 0.48;
    x.beginPath(); x.moveTo(0, y); x.lineTo(W, y); x.stroke();
  }
  for (let i = 0; i <= 48; i++) {
    const xx = (i / 48) * W;
    x.beginPath(); x.moveTo(xx, H * 0.52); x.lineTo(W / 2 + (xx - W / 2) * 3.2, H); x.stroke();
  }

  // ceiling light rails
  x.strokeStyle = palette[2] + '44'; x.lineWidth = 2;
  for (let i = 0; i < 5; i++) {
    const y = H * 0.1 + i * H * 0.06;
    x.beginPath(); x.moveTo(0, y); x.lineTo(W, y); x.stroke();
  }

  // glow structures (columns / portals)
  for (let i = 0; i < 14; i++) {
    const cx = rn() * W, cw = 30 + rn() * 90, ch = H * (0.12 + rn() * 0.2);
    const g = x.createLinearGradient(cx, H * 0.52 - ch, cx, H * 0.52);
    g.addColorStop(0, 'transparent');
    g.addColorStop(1, (i % 3 === 0 ? palette[3] : i % 3 === 1 ? palette[1] : palette[2]) + '66');
    x.fillStyle = g; x.fillRect(cx - cw / 2, H * 0.52 - ch, cw, ch);
  }

  // stars / particles
  for (let i = 0; i < 420; i++) {
    x.globalAlpha = rn() * 0.7;
    x.fillStyle = '#fff';
    x.beginPath(); x.arc(rn() * W, rn() * H * 0.5, rn() * 1.4 + 0.2, 0, 7); x.fill();
  }
  x.globalAlpha = 1;

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.mapping = THREE.EquirectangularReflectionMapping;
  return tex;
}

/**
 * Hotspots per world (spec §23). `world` = travel to another ACTTOLOG 360
 * environment; `route` = travel to an information layer (section page).
 * Every world gets at least two ways out — nobody is ever trapped.
 */
const HOTSPOTS: { in: string; dir: [number, number, number]; label: string; target?: string; route?: string }[] = [
  // ACTTOLOG World — the hub
  { in: 'world', dir: [0.9, 0.05, 0.4], label: 'RESEARCH LAB', target: 'lab' },
  { in: 'world', dir: [-0.85, 0.08, 0.5], label: 'ACADEMY', target: 'academy' },
  { in: 'world', dir: [0.1, 0.05, -0.95], label: 'GAMES ARENA', target: 'arena' },
  { in: 'world', dir: [-0.3, -0.05, -0.9], label: 'DARKROOM', target: 'darkroom' },
  { in: 'world', dir: [0.55, 0.25, -0.75], label: 'AI CORE', target: 'ai' },
  // Research Lab
  { in: 'lab', dir: [0.4, 0.05, 0.9], label: 'THESYN RESEARCH', route: '/research' },
  { in: 'lab', dir: [-0.9, 0.05, -0.3], label: 'DIGITAL LIBRARY', target: 'library' },
  { in: 'lab', dir: [0.95, 0.1, -0.2], label: 'ACTTOLOG WORLD', target: 'world' },
  // Academy
  { in: 'academy', dir: [0.3, 0.05, 0.95], label: 'OPEN ACADEMY', route: '/academy' },
  { in: 'academy', dir: [-0.95, 0.05, 0.2], label: 'DIGITAL LIBRARY', target: 'library' },
  { in: 'academy', dir: [0.9, 0.1, -0.35], label: 'ACTTOLOG WORLD', target: 'world' },
  // Games Arena
  { in: 'arena', dir: [0.2, 0.05, -0.95], label: 'ENTER GAMES', route: '/games' },
  { in: 'arena', dir: [-0.9, 0.05, 0.4], label: 'ENTERTAINMENT', target: 'cinema' },
  { in: 'arena', dir: [0.95, 0.1, 0.25], label: 'ACTTOLOG WORLD', target: 'world' },
  // Darkroom
  { in: 'darkroom', dir: [-0.4, -0.05, -0.9], label: 'OPEN DARKROOM', route: '/darkroom' },
  { in: 'darkroom', dir: [0.85, 0.05, 0.5], label: 'AI CORE', target: 'ai' },
  { in: 'darkroom', dir: [-0.95, 0.1, 0.1], label: 'ACTTOLOG WORLD', target: 'world' },
  // Digital Library
  { in: 'library', dir: [0.6, 0.2, -0.7], label: 'OPEN BLOG', route: '/blog' },
  { in: 'library', dir: [-0.7, 0.05, 0.65], label: 'RESEARCH LAB', target: 'lab' },
  { in: 'library', dir: [0.95, -0.1, -0.2], label: 'ACTTOLOG WORLD', target: 'world' },
  // Entertainment
  { in: 'cinema', dir: [0.15, 0.05, 0.95], label: 'ENTERTAINMENT', route: '/entertainment' },
  { in: 'cinema', dir: [-0.9, 0.08, -0.35], label: 'GAMES ARENA', target: 'arena' },
  { in: 'cinema', dir: [0.9, 0.05, -0.4], label: 'ACTTOLOG WORLD', target: 'world' },
  // Editorial
  { in: 'blog', dir: [-0.2, 0.05, 0.95], label: 'READ THE BLOG', route: '/blog' },
  { in: 'blog', dir: [0.9, 0.08, 0.35], label: 'DIGITAL LIBRARY', target: 'library' },
  { in: 'blog', dir: [-0.95, 0.05, -0.2], label: 'ACTTOLOG WORLD', target: 'world' },
  // Offers Showcase
  { in: 'offers', dir: [0.25, 0.05, -0.95], label: 'VIEW OFFERS', route: '/offers' },
  { in: 'offers', dir: [-0.9, 0.05, 0.4], label: 'ENTERTAINMENT', target: 'cinema' },
  { in: 'offers', dir: [0.95, 0.1, 0.2], label: 'ACTTOLOG WORLD', target: 'world' },
  // Intelligence Core
  { in: 'ai', dir: [-0.1, 0.05, 0.95], label: 'ASK ACTTOLOG AI', route: '/ai' },
  { in: 'ai', dir: [0.9, 0.1, -0.4], label: 'RESEARCH LAB', target: 'lab' },
  { in: 'ai', dir: [-0.95, 0.05, -0.25], label: 'ACTTOLOG WORLD', target: 'world' },
  // Global Contact
  { in: 'contact', dir: [0.2, 0.05, 0.95], label: 'CONTACT ACTTOLOG', route: '/contact' },
  { in: 'contact', dir: [-0.9, 0.05, 0.4], label: 'OFFERS SHOWCASE', target: 'offers' },
  { in: 'contact', dir: [0.95, 0.1, -0.2], label: 'ACTTOLOG WORLD', target: 'world' },
  // University Visit — travel the field (§23 field worlds)
  { in: 'university', dir: [0.15, 0.02, 0.95], label: 'ACADEMY COURSES', route: '/academy' },
  { in: 'university', dir: [-0.85, 0.06, 0.5], label: 'DIGITAL LIBRARY', target: 'library' },
  { in: 'university', dir: [0.9, 0.08, -0.4], label: 'RESEARCH LAB', target: 'lab' },
  { in: 'university', dir: [-0.3, 0.02, -0.92], label: 'MUSEUM GALLERY', target: 'museum' },
  { in: 'university', dir: [0.6, 0.3, 0.7], label: 'ACTTOLOG WORLD', target: 'world' },
  // Museum Gallery
  { in: 'museum', dir: [0.2, 0.03, 0.95], label: 'DARKROOM ARCHIVE', target: 'darkroom' },
  { in: 'museum', dir: [-0.9, 0.06, 0.4], label: 'BLOG STORIES', route: '/blog' },
  { in: 'museum', dir: [0.9, 0.08, -0.4], label: 'UNIVERSITY VISIT', target: 'university' },
  { in: 'museum', dir: [-0.3, 0.02, -0.92], label: 'ACTTOLOG WORLD', target: 'world' },
];

function makeHotspotLabel(text: string): THREE.CanvasTexture {
  const c = document.createElement('canvas'); c.width = 320; c.height = 96;
  const x = c.getContext('2d')!;
  x.fillStyle = 'rgba(5,6,12,.74)';
  x.strokeStyle = 'rgba(53,224,255,.85)'; x.lineWidth = 3;
  x.beginPath(); x.roundRect(8, 20, 304, 56, 26); x.fill(); x.stroke();
  x.fillStyle = '#e8eeff'; x.font = '600 26px "Space Grotesk", sans-serif';
  x.textAlign = 'center'; x.textBaseline = 'middle';
  x.fillText(text, 160, 49, 292);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

/** Builds only the hotspots that belong to `worldId` (spec §23). */
function buildHotspots(scene: THREE.Scene, worldId: string): THREE.Sprite[] {
  return HOTSPOTS.filter((h) => h.in === worldId).map((h) => {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: makeHotspotLabel(h.label), depthTest: false, transparent: true }));
    sp.position.set(...h.dir).normalize().multiplyScalar(6);
    sp.scale.set(1.9, 0.57, 1);
    sp.userData.hot = h;
    scene.add(sp);
    return sp;
  });
}

function disposeHotspots(scene: THREE.Scene, hotspots: THREE.Sprite[]) {
  hotspots.forEach((h) => { scene.remove(h); (h.material.map as THREE.Texture)?.dispose(); h.material.dispose(); });
}

/** The founder-guide presence — a real photo ring in every 360 world. */
function buildGuide(scene: THREE.Scene): THREE.Sprite {
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: makeGuideTexture(), depthTest: false, transparent: true }));
  sp.position.set(0.42, -0.14, 0.9).normalize().multiplyScalar(5.4);
  sp.scale.set(1.15, 1.15, 1);
  sp.userData.guide = true;
  scene.add(sp);
  return sp;
}

function disposeGuide(scene: THREE.Scene, guide: THREE.Sprite | null | undefined) {
  if (!guide) return;
  scene.remove(guide);
  (guide.material.map as THREE.Texture)?.dispose();
  guide.material.dispose();
}

/**
 * 360° ACTTOLOG Worlds — procedural, owned environments with hotspots.
 * Google Street View integration activates only when a Maps key is
 * configured; until then this is clearly labelled as ACTTOLOG content.
 */
export function Pano360({ world, onWorld, reduced }: {
  world: string;
  onWorld: (id: string) => void;
  reduced: boolean;
}) {
  const mountRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef<{ renderer?: THREE.WebGLRenderer; scene?: THREE.Scene; camera?: THREE.PerspectiveCamera; sphere?: THREE.Mesh; hotspots: THREE.Sprite[]; guide?: THREE.Sprite | null; tex?: THREE.Texture; raf: number; lon: number; lat: number; tLon: number; tLat: number; fov: number; tFov: number; drag: boolean; lx: number; ly: number }>({ hotspots: [], guide: null, raf: 0, lon: 0, lat: 0, tLon: 0, tLat: 0, fov: 72, tFov: 72, drag: false, lx: 0, ly: 0 });
  const worldRef = useRef(world);
  const onWorldRef = useRef(onWorld);
  onWorldRef.current = onWorld;
  const router = useRouter();
  const routerRef = useRef(router);
  routerRef.current = router;
  const [guideOpen, setGuideOpen] = useState(false);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    const st = stateRef.current;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    mount.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(72, mount.clientWidth / mount.clientHeight, 0.1, 100);
    const geo = new THREE.SphereGeometry(10, 48, 32);
    geo.scale(-1, 1, 1); // inside-out
    const mat = new THREE.MeshBasicMaterial({ toneMapped: false });
    const sphere = new THREE.Mesh(geo, mat);
    scene.add(sphere);

    // hotspot sprites — only the current world's exits — plus the guide
    st.hotspots = buildHotspots(scene, worldRef.current);
    st.guide = buildGuide(scene);

    st.renderer = renderer; st.scene = scene; st.camera = camera; st.sphere = sphere;

    const ray = new THREE.Raycaster();
    const ptrs = new Map<number, { x: number; y: number }>();
    let pinchDist = 0;
    const down = (e: PointerEvent) => {
      ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
      st.drag = ptrs.size === 1; st.lx = e.clientX; st.ly = e.clientY;
      if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; pinchDist = Math.hypot(a.x - b.x, a.y - b.y); }
    };
    const move = (e: PointerEvent) => {
      if (ptrs.has(e.pointerId)) ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (ptrs.size === 2) { // pinch → zoom (§14 touch)
        const [a, b] = [...ptrs.values()];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (pinchDist > 0) st.tFov = Math.max(35, Math.min(90, st.tFov + (pinchDist - d) * 0.08));
        pinchDist = d;
        return;
      }
      if (!st.drag) return;
      st.tLon -= (e.clientX - st.lx) * 0.12;
      st.tLat = Math.max(-70, Math.min(70, st.tLat + (e.clientY - st.ly) * 0.1));
      st.lx = e.clientX; st.ly = e.clientY;
    };
    const up = (e: PointerEvent) => {
      const wasDrag = st.drag && (Math.abs(e.clientX - st.lx) + Math.abs(e.clientY - st.ly)) > 4;
      ptrs.delete(e.pointerId);
      if (ptrs.size < 2) pinchDist = 0;
      st.drag = ptrs.size === 1;
      if (wasDrag) return;
      // click → hotspot?
      const r = mount.getBoundingClientRect();
      const ndc = new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(ndc, camera);
      if (st.guide) {
        const gh = ray.intersectObject(st.guide, false);
        if (gh.length) { setGuideOpen(true); track('cta_interaction', { cta: 'guide_sprite' }); return; }
      }
      const hits = ray.intersectObjects(st.hotspots, false);
      if (hits.length) {
        const hot = hits[0].object.userData.hot as { target?: string; route?: string; label: string };
        if (hot.route) routerRef.current?.push(hot.route);
        else if (hot.target) onWorldRef.current(hot.target);
      }
    };
    const wheel = (e: WheelEvent) => { e.preventDefault(); st.tFov = Math.max(35, Math.min(90, st.tFov + e.deltaY * 0.03)); };
    const el = renderer.domElement;
    el.addEventListener('pointerdown', down);
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    el.addEventListener('wheel', wheel, { passive: false });

    const auto = reduced ? 0 : 0.02;
    const loop = () => {
      st.raf = requestAnimationFrame(loop);
      if (!st.drag) st.tLon += auto;
      st.lon += (st.tLon - st.lon) * 0.12;
      st.lat += (st.tLat - st.lat) * 0.12;
      st.fov += (st.tFov - st.fov) * 0.15;
      camera.fov = st.fov; camera.updateProjectionMatrix();
      const phi = THREE.MathUtils.degToRad(90 - st.lat);
      const theta = THREE.MathUtils.degToRad(st.lon);
      camera.lookAt(
        Math.sin(phi) * Math.cos(theta) * 10,
        Math.cos(phi) * 10,
        Math.sin(phi) * Math.sin(theta) * 10,
      );
      renderer.render(scene, camera);
    };
    loop();

    const onResize = () => {
      renderer.setSize(mount.clientWidth, mount.clientHeight);
      camera.aspect = mount.clientWidth / mount.clientHeight;
      camera.updateProjectionMatrix();
    };
    window.addEventListener('resize', onResize);
    return () => {
      cancelAnimationFrame(st.raf);
      window.removeEventListener('resize', onResize);
      el.removeEventListener('pointerdown', down);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      el.removeEventListener('wheel', wheel);
      disposeHotspots(scene, st.hotspots); st.hotspots = [];
      disposeGuide(scene, st.guide); st.guide = null;
      st.tex?.dispose(); geo.dispose(); mat.dispose(); renderer.dispose();
      mount.removeChild(renderer.domElement);
    };
  }, [reduced]);

  // world switch → new panorama texture (crossfade via material opacity)
  useEffect(() => {
    const st = stateRef.current;
    if (!st.sphere || worldRef.current === world) { worldRef.current = world; return; }
    worldRef.current = world;
    const def = WORLDS_360.find((w) => w.id === world) || WORLDS_360[0];
    const mat = (st.sphere as THREE.Mesh).material as THREE.MeshBasicMaterial;
    const old = st.tex;
    const apply = (next: THREE.Texture) => {
      st.tex = next;
      mat.transparent = true; mat.opacity = 0; mat.map = next; mat.needsUpdate = true;
      let o = 0;
      const fade = setInterval(() => {
        o += 0.12; mat.opacity = Math.min(1, o);
        if (o >= 1) { clearInterval(fade); mat.transparent = false; old?.dispose(); }
      }, 40);
    };
    if ('pano' in def && def.pano) loadPanoTexture(def.pano, (t) => apply(t || panoTexture(def.id, def.palette)));
    else apply(panoTexture(def.id, def.palette));
    if (st.scene) {
      disposeHotspots(st.scene, st.hotspots); st.hotspots = buildHotspots(st.scene, world);
      disposeGuide(st.scene, st.guide); st.guide = buildGuide(st.scene);
    }
  }, [world]);

  // initial texture
  useEffect(() => {
    const st = stateRef.current;
    if (!st.sphere || st.tex) return;
    const def = WORLDS_360.find((w) => w.id === world) || WORLDS_360[0];
    const mat = (st.sphere as THREE.Mesh).material as THREE.MeshBasicMaterial;
    const def0 = WORLDS_360.find((w) => w.id === world) || WORLDS_360[0];
    const apply0 = (t: THREE.Texture) => { st.tex = t; mat.map = t; mat.needsUpdate = true; };
    if ('pano' in def0 && def0.pano) loadPanoTexture(def0.pano, (t) => apply0(t || panoTexture(def0.id, def0.palette)));
    else apply0(panoTexture(def0.id, def0.palette));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="absolute inset-0">
      <div ref={mountRef} className="absolute inset-0" style={{ cursor: 'grab' }} />
      <button className="chip absolute right-3 bottom-3 z-10 !py-1.5 !px-3 !text-[9.6px]"
        style={{ background: 'color-mix(in srgb, var(--bg) 72%, transparent)' }}
        onClick={() => { setGuideOpen((v) => !v); track('cta_interaction', { cta: 'guide_chip' }); }}
        aria-label="Meet your guide">
        <span className="inline-block w-4 h-4 rounded-full align-[-3px] mr-1.5"
          style={{ backgroundImage: 'url(/media/founder-avatar.jpg)', backgroundSize: 'cover', border: '1px solid var(--cy)' }} />
        GUIDE
      </button>
      {guideOpen && (
        <div className="absolute left-3 bottom-3 z-10 panel p-5 w-[min(360px,88vw)]" role="dialog" aria-label="Your guide in the Acttolog world"
          style={{ maxHeight: '62vh', overflow: 'auto' }}>
          <div className="flex items-start gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/media/founder-pro.jpg" alt="The founder and guide of the Acttolog world"
              className="w-20 h-20 rounded-2xl object-cover flex-none" style={{ border: '1px solid color-mix(in srgb,var(--cy) 55%,transparent)', boxShadow: '0 0 22px color-mix(in srgb,var(--cy) 25%,transparent)' }} />
            <div>
              <div className="eyebrow mb-1">YOUR GUIDE · संस्थापक</div>
              <div className="font-display font-bold text-[16px] leading-tight">The Founder & Guide</div>
              <div className="dim mono text-[9.6px] tracking-[.18em] mt-1">FOUNDER · ACTTOLOG WORLD</div>
            </div>
            <button className="ico !w-8 !h-8 ml-auto flex-none" aria-label="Close guide" onClick={() => setGuideOpen(false)}>✕</button>
          </div>
          <p className="mut text-[12.6px] leading-relaxed mt-4">
            The founder built Acttolog as one connected digital world — Earth, map, satellite, 360 field
            worlds, research, academy and more. His ring floats in every 360° environment: tap it any time
            to travel with a guide, or step into the field worlds below.
          </p>
          <div className="flex flex-wrap gap-2 mt-4">
            <button className="chip" onClick={() => { setGuideOpen(false); onWorldRef.current('university'); }}>
              <Icon name="book" size={11} />UNIVERSITY VISIT
            </button>
            <button className="chip" onClick={() => { setGuideOpen(false); window.dispatchEvent(new CustomEvent('acttolog:ai-open', { detail: 'Introduce the Acttolog world and what I can explore' })); }}>
              <Icon name="brain" size={11} />ASK WITH THE GUIDE
            </button>
            <Link className="chip" href="/about"><Icon name="users" size={11} />ABOUT</Link>
            <Link className="chip" href="/contact"><Icon name="mail" size={11} />CONTACT</Link>
          </div>
        </div>
      )}
    </div>
  );
}
