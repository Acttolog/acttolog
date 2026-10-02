'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import * as THREE from 'three';
import { WORLDS_360 } from '@/lib/world/config';

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
  const stateRef = useRef<{ renderer?: THREE.WebGLRenderer; scene?: THREE.Scene; camera?: THREE.PerspectiveCamera; sphere?: THREE.Mesh; hotspots: THREE.Sprite[]; tex?: THREE.Texture; raf: number; lon: number; lat: number; tLon: number; tLat: number; fov: number; tFov: number; drag: boolean; lx: number; ly: number }>({ hotspots: [], raf: 0, lon: 0, lat: 0, tLon: 0, tLat: 0, fov: 72, tFov: 72, drag: false, lx: 0, ly: 0 });
  const worldRef = useRef(world);
  const onWorldRef = useRef(onWorld);
  onWorldRef.current = onWorld;
  const router = useRouter();
  const routerRef = useRef(router);
  routerRef.current = router;

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

    // hotspot sprites — only the current world's exits
    st.hotspots = buildHotspots(scene, worldRef.current);

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
    const next = panoTexture(def.id, def.palette);
    st.tex = next;
    mat.transparent = true; mat.opacity = 0; mat.map = next; mat.needsUpdate = true;
    if (st.scene) { disposeHotspots(st.scene, st.hotspots); st.hotspots = buildHotspots(st.scene, world); }
    let o = 0;
    const fade = setInterval(() => {
      o += 0.12; mat.opacity = Math.min(1, o);
      if (o >= 1) { clearInterval(fade); mat.transparent = false; old?.dispose(); }
    }, 40);
  }, [world]);

  // initial texture
  useEffect(() => {
    const st = stateRef.current;
    if (!st.sphere || st.tex) return;
    const def = WORLDS_360.find((w) => w.id === world) || WORLDS_360[0];
    st.tex = panoTexture(def.id, def.palette);
    const mat = (st.sphere as THREE.Mesh).material as THREE.MeshBasicMaterial;
    mat.map = st.tex; mat.needsUpdate = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div ref={mountRef} className="absolute inset-0" style={{ cursor: 'grab' }} />;
}
