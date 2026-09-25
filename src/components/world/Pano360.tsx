'use client';

import { useEffect, useRef } from 'react';
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

const HOTSPOTS: { world: string; dir: [number, number, number]; label: string; route?: string }[] = [
  { world: 'lab', dir: [0.9, 0.05, 0.4], label: 'RESEARCH' },
  { world: 'academy', dir: [-0.8, 0.1, 0.6], label: 'ACADEMY' },
  { world: 'arena', dir: [0.2, 0.05, -0.95], label: 'GAMES' },
  { world: 'darkroom', dir: [-0.4, -0.05, -0.9], label: 'DARKROOM' },
  { world: 'library', dir: [0.6, 0.2, -0.7], label: 'LIBRARY' },
];

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

    // hotspot sprites
    const makeLabel = (text: string) => {
      const c = document.createElement('canvas'); c.width = 256; c.height = 96;
      const x = c.getContext('2d')!;
      x.fillStyle = 'rgba(5,6,12,.72)';
      x.strokeStyle = 'rgba(53,224,255,.8)'; x.lineWidth = 3;
      x.beginPath(); x.roundRect(8, 20, 240, 56, 26); x.fill(); x.stroke();
      x.fillStyle = '#e8eeff'; x.font = '600 30px "Space Grotesk", sans-serif';
      x.textAlign = 'center'; x.textBaseline = 'middle';
      x.fillText(text, 128, 49);
      const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
    };
    st.hotspots = HOTSPOTS.map((h) => {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: makeLabel(h.label), depthTest: false, transparent: true }));
      sp.position.set(...(h.dir as [number, number, number])).normalize().multiplyScalar(6);
      sp.scale.set(1.7, 0.64, 1);
      sp.userData.hot = h;
      scene.add(sp);
      return sp;
    });

    st.renderer = renderer; st.scene = scene; st.camera = camera; st.sphere = sphere;

    const ray = new THREE.Raycaster();
    const down = (e: PointerEvent) => { st.drag = true; st.lx = e.clientX; st.ly = e.clientY; };
    const move = (e: PointerEvent) => {
      if (!st.drag) return;
      st.tLon -= (e.clientX - st.lx) * 0.12;
      st.tLat = Math.max(-70, Math.min(70, st.tLat + (e.clientY - st.ly) * 0.1));
      st.lx = e.clientX; st.ly = e.clientY;
    };
    const up = (e: PointerEvent) => {
      const wasDrag = st.drag && (Math.abs(e.clientX - st.lx) + Math.abs(e.clientY - st.ly)) > 4;
      st.drag = false;
      if (wasDrag) return;
      // click → hotspot?
      const r = mount.getBoundingClientRect();
      const ndc = new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(ndc, camera);
      const hits = ray.intersectObjects(st.hotspots, false);
      if (hits.length) onWorldRef.current((hits[0].object.userData.hot as { world: string }).world);
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
      st.hotspots.forEach((h) => { (h.material.map as THREE.Texture)?.dispose(); h.material.dispose(); });
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
