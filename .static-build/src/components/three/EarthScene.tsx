'use client';

/**
 * ACTTOLOG WORLD — EarthScene (spec §22–24)
 *
 * Cinematic + scientific + elegant + futuristic:
 *  · day/night Earth via custom terminator shader
 *  · fresnel atmosphere shell (cyan→violet)
 *  · procedural starfield + drifting dust
 *  · tilted orbital rings with dash-flow energy
 *  · great-circle connection arcs with travelling pulses (high tier)
 *  · five division nodes (sprite labels, click → division route)
 *  · idle auto-rotation + drag inertia + pointer parallax + scroll-linked dolly
 *  · performance tiers (High/Medium/Low), reduced-motion respect,
 *    frustum/idle pause via frameloop control, WebGL poster fallback (parent)
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { TIER_CONFIG, prefersReducedMotion, type QualityTier } from './tier';
import { TileSphere, type TileLayer } from './TileGlobe';

/* ── live entity beacons (OSINT-style pulses over world cities) ─── */
export const ENTITY_POINTS: [number, number][] = [
  [27.71, 85.32], [34.05, -118.24], [42.36, -71.06], [35.68, 139.69], [52.52, 13.4],
  [51.5, -0.12], [48.85, 2.35], [55.75, 37.62], [39.9, 116.4], [28.61, 77.2],
  [19.07, 72.87], [13.08, 80.27], [23.81, 90.41], [24.86, 67.0], [31.55, 74.34],
  [19.43, -99.13], [-23.55, -46.63], [40.71, -74.0], [43.65, -79.38], [49.28, -123.12],
  [-33.87, 151.21], [-36.85, 174.76], [1.35, 103.82], [22.32, 114.17], [37.57, 126.98],
  [30.04, 31.24], [6.52, 3.37], [-1.29, 36.82], [25.2, 55.27], [41.01, 28.98],
  [59.33, 18.06], [45.46, 9.19], [40.42, -3.7], [38.72, -9.14], [60.17, 24.94],
  [64.13, -21.9],
];

export const ENTITY_COUNT = ENTITY_POINTS.length;

/** Lat/lon graticule — the intelligence-grid look. */
function Graticule() {
  const geo = useMemo(() => {
    const pts: number[] = [];
    const R = 1.004;
    const push = (lat: number, lon: number) => { const v = latLonToVec3(lat, lon, R); pts.push(v.x, v.y, v.z); };
    for (let lat = -75; lat <= 75; lat += 15) for (let lon = -180; lon < 180; lon += 4) { push(lat, lon); push(lat, lon + 4); }
    for (let lon = -180; lon < 180; lon += 15) for (let lat = -88; lat < 88; lat += 4) { push(lat, lon); push(lat + 4, lon); }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    return g;
  }, []);
  return (
    <lineSegments geometry={geo}>
      <lineBasicMaterial color="#35e0ff" transparent opacity={0.09} depthWrite={false} />
    </lineSegments>
  );
}

function EntityBeacons({ reduced }: { reduced: boolean }) {
  const refs = useRef<(THREE.Mesh | null)[]>([]);
  useFrame((state) => {
    if (reduced) return;
    const t = state.clock.elapsedTime;
    refs.current.forEach((m, i) => {
      if (!m) return;
      const k = (t * 0.5 + i * 0.137) % 1;
      m.scale.setScalar(0.5 + k * 2.2);
      (m.material as THREE.MeshBasicMaterial).opacity = 0.45 * (1 - k);
    });
  });
  return (
    <group>
      {ENTITY_POINTS.map(([lat, lon], i) => {
        const pos = latLonToVec3(lat, lon, 1.006);
        const out = pos.clone().normalize();
        return (
          <group key={i} position={pos}>
            <mesh>
              <sphereGeometry args={[0.006, 8, 8]} />
              <meshBasicMaterial color={i % 5 === 0 ? '#ff4ecd' : '#9be8ff'} toneMapped={false} />
            </mesh>
            <mesh ref={(el) => { refs.current[i] = el; }}
              quaternion={new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), out)}>
              <ringGeometry args={[0.012, 0.016, 24]} />
              <meshBasicMaterial color="#35e0ff" transparent opacity={0.4} side={THREE.DoubleSide}
                blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

/* ── division nodes — real places, real routes ─────────────────── */

export interface GlobeNode {
  id: string; name: string; sub: string; route: string; color: string;
  lat: number; lon: number;
}

export const DIVISION_NODES: GlobeNode[] = [
  { id: 'research', name: 'Thesyn Research', sub: 'RESEARCH & ACADEMIC SUPPORT', route: '/research', color: '#35e0ff', lat: 27.717, lon: 85.324 },   // Kathmandu — home base
  { id: 'entertainment', name: 'Entertainment', sub: 'STORIES & DIGITAL MEDIA', route: '/entertainment', color: '#ff4ecd', lat: 34.052, lon: -118.244 },
  { id: 'academy', name: 'Academy', sub: 'LEARNING & KNOWLEDGE', route: '/academy', color: '#7c5cff', lat: 42.361, lon: -71.058 },
  { id: 'games', name: 'Games', sub: 'INTERACTIVE EXPERIENCES', route: '/games', color: '#3ddc97', lat: 35.681, lon: 139.767 },
  { id: 'darkroom', name: 'Darkroom', sub: 'DIGITAL DISCOVERY & RESOURCES', route: '/darkroom', color: '#f5c26b', lat: 52.52, lon: 13.405 },
];

const ARC_PAIRS: [number, number][] = [[0, 1], [1, 2], [2, 3], [3, 4], [4, 0], [0, 2], [1, 3], [2, 4]];

export function latLonToVec3(lat: number, lon: number, r: number): THREE.Vector3 {
  const phi = ((90 - lat) * Math.PI) / 180;
  const theta = ((lon + 180) * Math.PI) / 180;
  return new THREE.Vector3(
    -r * Math.sin(phi) * Math.cos(theta),
    r * Math.cos(phi),
    r * Math.sin(phi) * Math.sin(theta),
  );
}

/* ── shaders ────────────────────────────────────────────────────── */

const EARTH_VERT = /* glsl */ `
varying vec2 vUv;
varying vec3 vWorldNormal;
varying vec3 vWorldPos;
void main() {
  vUv = uv;
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWorldPos = wp.xyz;
  vWorldNormal = normalize(mat3(modelMatrix) * normal);
  gl_Position = projectionMatrix * viewMatrix * wp;
}`;

const EARTH_FRAG = /* glsl */ `
uniform sampler2D dayMap;
uniform sampler2D nightMap;
uniform vec3 sunDir;
varying vec2 vUv;
varying vec3 vWorldNormal;
varying vec3 vWorldPos;
uniform float loaded;
void main() {
  vec3 day = loaded > 0.5 ? pow(texture2D(dayMap, vUv).rgb, vec3(2.2)) : vec3(0.02, 0.07, 0.16);
  vec3 night = loaded > 0.5 ? pow(texture2D(nightMap, vUv).rgb, vec3(2.2)) : vec3(0.0);
  vec3 n = normalize(vWorldNormal);
  float d = dot(n, normalize(sunDir));
  float lit = smoothstep(-0.18, 0.3, d);
  vec3 col = mix(night * 1.35, day * (0.16 + 1.05 * max(d, 0.0)), lit);
  // scientific cyan rim — atmosphere scattering suggestion
  vec3 viewDir = normalize(cameraPosition - vWorldPos);
  float rim = 1.0 - max(dot(n, viewDir), 0.0);
  col += vec3(0.21, 0.88, 1.0) * pow(rim, 3.2) * 0.42;
  col += vec3(0.49, 0.36, 1.0) * pow(rim, 5.0) * 0.22;
  gl_FragColor = vec4(col, 1.0);
  #include <colorspace_fragment>
}`;

const ATMO_VERT = /* glsl */ `
varying vec3 vNormal;
varying vec3 vViewDir;
void main() {
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vViewDir = normalize(cameraPosition - wp.xyz);
  vNormal = normalize(mat3(modelMatrix) * normal);
  gl_Position = projectionMatrix * viewMatrix * wp;
}`;

const ATMO_FRAG = /* glsl */ `
uniform vec3 glowColor;
varying vec3 vNormal;
varying vec3 vViewDir;
void main() {
  // front-side fresnel: zero at disc centre, max at the limb (robust across drivers)
  float f = clamp(1.0 - dot(normalize(vNormal), normalize(vViewDir)), 0.0, 1.0);
  float intensity = pow(f, 3.4) * 1.25;
  gl_FragColor = vec4(glowColor * intensity, intensity);
  #include <colorspace_fragment>
}`;

/* ── sub-components ─────────────────────────────────────────────── */

function Earth({ segments, sunDir, onCursor }: { segments: number; sunDir: THREE.Vector3; onCursor?: (lat: number | null, lon: number | null) => void }) {
  const matRef = useRef<THREE.ShaderMaterial>(null);
  const uniforms = useMemo(() => ({
    dayMap: { value: null as THREE.Texture | null },
    nightMap: { value: null as THREE.Texture | null },
    sunDir: { value: sunDir },
    loaded: { value: 0 },
  }), [sunDir]);

  // R3F copies the uniforms prop into the material at mount; texture updates
  // must therefore mutate material.uniforms directly (not the source object).
  const applyTex = useCallback((key: 'dayMap' | 'nightMap', tex: THREE.Texture) => {
    const u = matRef.current?.uniforms as Record<string, { value: unknown }> | undefined;
    if (!u) return;
    u[key].value = tex;
    const both = Boolean((u.dayMap.value as unknown) && (u.nightMap.value as unknown));
    u.loaded.value = both ? 1 : 0;
    if (typeof window !== 'undefined') {
      (window as unknown as { __atlEarth?: Record<string, unknown> }).__atlEarth = {
        loaded: u.loaded.value, day: Boolean(u.dayMap.value), night: Boolean(u.nightMap.value),
      };
    }
  }, []);

  useEffect(() => {
    const loader = new THREE.TextureLoader();
    let cancelled = false;
    const pending: Partial<Record<'dayMap' | 'nightMap', THREE.Texture>> = {};
    const load = (url: string, key: 'dayMap' | 'nightMap') => {
      loader.load(url, (tex) => {
        if (cancelled) { tex.dispose(); return; }
        // Raw sRGB bytes (RGBA8) for maximum driver compatibility;
        // the shader linearises manually with pow(c, 2.2).
        tex.colorSpace = THREE.NoColorSpace;
        pending[key] = tex;
        applyTex(key, tex);
      });
    };
    load('/textures/earth-day.jpg', 'dayMap');
    load('/textures/earth-lights.jpg', 'nightMap');
    // if textures arrived before the material ref was ready, flush on next tick
    const t = setTimeout(() => {
      (Object.keys(pending) as ('dayMap' | 'nightMap')[]).forEach((k) => applyTex(k, pending[k]!));
    }, 250);
    return () => { cancelled = true; clearTimeout(t); };
  }, [applyTex]);

  return (
    <mesh
      onPointerMove={(e) => {
        if (!onCursor) return;
        const local = e.object.worldToLocal(e.point.clone());
        const r = local.length() || 1;
        const lat = 90 - (Math.acos(local.y / r) * 180) / Math.PI;
        let lon = (Math.atan2(local.z, -local.x) * 180) / Math.PI - 180;
        if (lon < -180) lon += 360; if (lon > 180) lon -= 360;
        onCursor(lat, lon);
      }}
      onPointerOut={() => onCursor && onCursor(null, null)}
    >
      <sphereGeometry args={[1, segments, segments]} />
      <shaderMaterial ref={matRef} vertexShader={EARTH_VERT} fragmentShader={EARTH_FRAG} uniforms={uniforms} />
    </mesh>
  );
}

function Atmosphere() {
  const uniforms = useMemo(() => ({ glowColor: { value: new THREE.Color('#4fb8ff') } }), []);
  return (
    <mesh scale={1.135}>
      <sphereGeometry args={[1, 48, 48]} />
      <shaderMaterial vertexShader={ATMO_VERT} fragmentShader={ATMO_FRAG} uniforms={uniforms}
        transparent side={THREE.FrontSide} blending={THREE.AdditiveBlending} depthWrite={false} />
    </mesh>
  );
}

function OrbitalRings({ count, reduced }: { count: number; reduced: boolean }) {
  const group = useRef<THREE.Group>(null);
  const tilts = useMemo(() => [
    { rx: 1.32, ry: 0.22, r: 1.42, color: '#35e0ff', op: 0.34 },
    { rx: 1.05, ry: -0.42, r: 1.62, color: '#7c5cff', op: 0.26 },
    { rx: 1.48, ry: 0.66, r: 1.84, color: '#ff4ecd', op: 0.16 },
  ].slice(0, count), [count]);
  useFrame((_, dt) => {
    if (reduced || !group.current) return;
    group.current.rotation.y += dt * 0.012;
  });
  return (
    <group ref={group}>
      {tilts.map((t, i) => (
        <mesh key={i} rotation={[t.rx, t.ry, 0]}>
          <torusGeometry args={[t.r, 0.0018, 6, 220]} />
          <meshBasicMaterial color={t.color} transparent opacity={t.op} blending={THREE.AdditiveBlending} depthWrite={false} />
        </mesh>
      ))}
    </group>
  );
}

function makeLabelTexture(name: string, color: string): THREE.Texture {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 96;
  const x = c.getContext('2d')!;
  x.clearRect(0, 0, 512, 96);
  x.font = '600 34px "Space Grotesk", sans-serif';
  x.textAlign = 'center';
  x.textBaseline = 'middle';
  x.shadowColor = color;
  x.shadowBlur = 18;
  x.fillStyle = '#e8eeff';
  x.fillText(name.toUpperCase(), 256, 48);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function DivisionNodes({ nodes, labels, reduced, onSelect }: {
  nodes: GlobeNode[]; labels: boolean; reduced: boolean;
  onSelect: (route: string) => void;
}) {
  const textures = useMemo(
    () => (labels ? nodes.map((n) => makeLabelTexture(n.name, n.color)) : []),
    [labels, nodes],
  );
  const pulseRefs = useRef<(THREE.Mesh | null)[]>([]);
  useFrame((state) => {
    if (reduced) return;
    const t = state.clock.elapsedTime;
    pulseRefs.current.forEach((m, i) => {
      if (!m) return;
      const k = (t * 0.6 + i * 0.37) % 1;
      m.scale.setScalar(0.6 + k * 2.4);
      (m.material as THREE.MeshBasicMaterial).opacity = 0.5 * (1 - k);
    });
  });
  return (
    <group>
      {nodes.map((n, i) => {
        const pos = latLonToVec3(n.lat, n.lon, 1.005);
        const out = pos.clone().normalize();
        return (
          <group key={n.id} position={pos}>
            <mesh
              onClick={(e) => { if (e.delta > 5) return; e.stopPropagation(); onSelect(n.route); }}
              onPointerOver={(e) => { e.stopPropagation(); document.body.style.cursor = 'pointer'; }}
              onPointerOut={() => { document.body.style.cursor = ''; }}
            >
              <sphereGeometry args={[0.022, 16, 16]} />
              <meshBasicMaterial color={n.color} toneMapped={false} />
            </mesh>
            {/* pulse ring oriented along the surface normal */}
            <mesh ref={(el) => { pulseRefs.current[i] = el; }}
              quaternion={new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), out)}>
              <ringGeometry args={[0.03, 0.036, 40]} />
              <meshBasicMaterial color={n.color} transparent opacity={0.5} side={THREE.DoubleSide}
                blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
            </mesh>
            {labels && textures[i] && (
              <sprite position={out.clone().multiplyScalar(0.14)} scale={[0.62, 0.116, 1]}>
                <spriteMaterial map={textures[i]} transparent depthWrite={false} toneMapped={false} />
              </sprite>
            )}
          </group>
        );
      })}
    </group>
  );
}

function Arcs({ nodes, pulses, reduced }: { nodes: GlobeNode[]; pulses: boolean; reduced: boolean }) {
  const curves = useMemo(() => ARC_PAIRS.map(([a, b]) => {
    const va = latLonToVec3(nodes[a].lat, nodes[a].lon, 1.005);
    const vb = latLonToVec3(nodes[b].lat, nodes[b].lon, 1.005);
    const mid = va.clone().add(vb).multiplyScalar(0.5);
    const lift = 1.12 + va.distanceTo(vb) * 0.22;
    mid.normalize().multiplyScalar(lift);
    return new THREE.QuadraticBezierCurve3(va, mid, vb);
  }), [nodes]);

  const geometries = useMemo(() => curves.map((c) => new THREE.TubeGeometry(c, 64, 0.0028, 6, false)), [curves]);
  const pulseRefs = useRef<(THREE.Mesh | null)[]>([]);
  useFrame((state) => {
    if (reduced || !pulses) return;
    const t = state.clock.elapsedTime;
    pulseRefs.current.forEach((m, i) => {
      if (!m) return;
      const curve = curves[i % curves.length];
      const k = (t * 0.14 + i * 0.19) % 1;
      m.position.copy(curve.getPoint(k));
    });
  });

  return (
    <group>
      {geometries.map((g, i) => (
        <mesh key={i} geometry={g}>
          <meshBasicMaterial color={i % 2 ? '#5f8dff' : '#35e0ff'} transparent opacity={0.3}
            blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
        </mesh>
      ))}
      {pulses && !reduced && Array.from({ length: 4 }).map((_, i) => (
        <mesh key={`p${i}`} ref={(el) => { pulseRefs.current[i] = el; }}>
          <sphereGeometry args={[0.012, 10, 10]} />
          <meshBasicMaterial color="#9be8ff" transparent opacity={0.95}
            blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
}

function Dust({ count, reduced }: { count: number; reduced: boolean }) {
  const ref = useRef<THREE.Points>(null);
  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    let s = 987654321;
    const rn = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
    for (let i = 0; i < count; i++) {
      const r = 1.6 + rn() * 1.9;
      const th = rn() * Math.PI * 2;
      const ph = Math.acos(2 * rn() - 1);
      arr[i * 3] = r * Math.sin(ph) * Math.cos(th);
      arr[i * 3 + 1] = r * Math.cos(ph) * 0.6;
      arr[i * 3 + 2] = r * Math.sin(ph) * Math.sin(th);
    }
    return arr;
  }, [count]);
  useFrame((_, dt) => {
    if (reduced || !ref.current) return;
    ref.current.rotation.y += dt * 0.008;
  });
  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.011} color="#8fd8ff" transparent opacity={0.42} sizeAttenuation
        blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
    </points>
  );
}


/** Hand-rolled starfield (replaces drei Stars — smaller graph, same look). */
function Starfield({ count }: { count: number }) {
  const ref = useRef<THREE.Points>(null);
  const { positions, sizes } = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    let s = 246813579;
    const rn = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
    for (let i = 0; i < count; i++) {
      const r = 40 + rn() * 70;
      const th = rn() * Math.PI * 2;
      const ph = Math.acos(2 * rn() - 1);
      positions[i * 3] = r * Math.sin(ph) * Math.cos(th);
      positions[i * 3 + 1] = r * Math.cos(ph);
      positions[i * 3 + 2] = r * Math.sin(ph) * Math.sin(th);
      sizes[i] = 0.35 + rn() * 1.1;
    }
    return { positions, sizes };
  }, [count]);
  useFrame((state) => {
    if (ref.current) ref.current.rotation.y = state.clock.elapsedTime * 0.0016;
  });
  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-size" args={[sizes, 1]} />
      </bufferGeometry>
      <pointsMaterial size={0.42} sizeAttenuation color="#cfe4ff" transparent opacity={0.85}
        depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
    </points>
  );
}

/** Camera rig: pointer parallax + scroll-linked dolly (spec §23). */
function Rig({ scrollRef, distTargetRef, distRef }: {
  scrollRef: React.RefObject<number>;
  distTargetRef: React.RefObject<number>;
  distRef: React.RefObject<number>;
}) {
  const { camera } = useThree();
  const cur = useRef(3.15);
  const target = useRef(new THREE.Vector3(0, 0.12, 3.15));
  useFrame((state, dt) => {
    const p = scrollRef.current ?? 0;
    const k = Math.min(1, dt * 3.2);
    const desired = (distTargetRef.current ?? 3.15) * (1 - p * 0.22);
    cur.current += (desired - cur.current) * Math.min(1, dt * 4.5);
    distRef.current = cur.current;
    target.current.set(
      state.pointer.x * 0.16 * (cur.current / 3.15) + p * 0.25,
      0.12 + state.pointer.y * 0.1 * (cur.current / 3.15) + p * 0.42,
      cur.current,
    );
    camera.position.lerp(target.current, k);
    camera.lookAt(0, p * 0.1, 0);
  });
  return null;
}


/**
 * UnrealBloom via three's own addons, lazily imported so the post-processing
 * module graph is only fetched on high-tier devices (spec §24).
 */
function BloomPass() {
  const { gl, scene, camera, size } = useThree();
  const composerRef = useRef<import('three/examples/jsm/postprocessing/EffectComposer.js').EffectComposer | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let disposed = false;
    (async () => {
      const [{ EffectComposer }, { RenderPass }, { UnrealBloomPass }, { OutputPass }] = await Promise.all([
        import('three/examples/jsm/postprocessing/EffectComposer.js'),
        import('three/examples/jsm/postprocessing/RenderPass.js'),
        import('three/examples/jsm/postprocessing/UnrealBloomPass.js'),
        import('three/examples/jsm/postprocessing/OutputPass.js'),
      ]);
      if (disposed) return;
      const composer = new EffectComposer(gl);
      composer.addPass(new RenderPass(scene, camera));
      composer.addPass(new UnrealBloomPass(new THREE.Vector2(size.width, size.height), 0.5, 0.72, 0.28));
      composer.addPass(new OutputPass());
      composerRef.current = composer;
      setReady(true);
    })();
    return () => { disposed = true; composerRef.current?.dispose(); composerRef.current = null; };
  }, [gl, scene, camera, size.width, size.height]);

  // priority >= 1 takes over rendering from R3F's default loop — only when ready
  useFrame((_, dt) => {
    if (composerRef.current) composerRef.current.render(dt);
  }, ready ? 1 : 0);

  return null;
}

function WorldGroup({ children, reduced, dragRef, tier, scrollRef, flyRef }: {
  children: React.ReactNode; reduced: boolean;
  dragRef: React.RefObject<{ dx: number; vel: number; dragging: boolean }>;
  tier: QualityTier;
  scrollRef: React.RefObject<number>;
  flyRef: React.RefObject<{ lat: number; lon: number; token: number } | null>;
}) {
  const group = useRef<THREE.Group>(null);
  const cfg = TIER_CONFIG[tier];
  const flyState = useRef({ token: -1, quat: new THREE.Quaternion(), active: false });
  useFrame((_, dt) => {
    if (!group.current) return;
    const fly = flyRef.current;
    if (fly && fly.token !== flyState.current.token) {
      flyState.current.token = fly.token;
      const v = latLonToVec3(fly.lat, fly.lon, 1).normalize();
      flyState.current.quat.setFromUnitVectors(v, new THREE.Vector3(0, 0, 1));
      flyState.current.active = true;
    }
    if (flyState.current.active) {
      group.current.quaternion.slerp(flyState.current.quat, Math.min(1, dt * 2.4));
      if (group.current.quaternion.angleTo(flyState.current.quat) < 0.01) flyState.current.active = false;
    }
    if (!reduced) {
      const drag = dragRef.current;
      if (drag) {
        if (drag.dragging) { drag.vel = drag.dx * 0.006; drag.dx = 0; flyState.current.active = false; }
        else drag.vel *= 0.94;
        group.current.rotation.y += drag.vel;
      }
      group.current.rotation.y += dt * cfg.autoRotate * 0.35;
      const p = scrollRef.current ?? 0;
      group.current.rotation.x = THREE.MathUtils.lerp(group.current.rotation.x, 0.16 + p * -0.22, Math.min(1, dt * 2));
    }
  });
  return <group ref={group}>{children}</group>;
}

/** Find-your-home pin — magenta pulse at the geocoded location. */
function PinMarker({ lat, lon }: { lat: number; lon: number }) {
  const ref = useRef<THREE.Mesh>(null);
  const pos = useMemo(() => latLonToVec3(lat, lon, 1.008), [lat, lon]);
  const out = useMemo(() => pos.clone().normalize(), [pos]);
  useFrame((state) => {
    if (!ref.current) return;
    const k = (state.clock.elapsedTime * 0.8) % 1;
    ref.current.scale.setScalar(0.8 + k * 3);
    (ref.current.material as THREE.MeshBasicMaterial).opacity = 0.7 * (1 - k);
  });
  return (
    <group position={pos}>
      <mesh>
        <sphereGeometry args={[0.012, 12, 12]} />
        <meshBasicMaterial color="#ff4ecd" toneMapped={false} />
      </mesh>
      <mesh ref={ref} quaternion={new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), out)}>
        <ringGeometry args={[0.02, 0.026, 32]} />
        <meshBasicMaterial color="#ff4ecd" transparent opacity={0.7} side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
      </mesh>
    </group>
  );
}

/* ── scene root ─────────────────────────────────────────────────── */

function Scene({ tier, scrollRef, distTargetRef, distRef, flyRef, dragRef, onSelect, onStats, onCursor, layer, tilesEnabled, pin }: {
  tier: QualityTier;
  scrollRef: React.RefObject<number>;
  distTargetRef: React.RefObject<number>;
  distRef: React.RefObject<number>;
  flyRef: React.RefObject<{ lat: number; lon: number; token: number } | null>;
  dragRef: React.RefObject<{ dx: number; vel: number; dragging: boolean }>;
  onSelect: (route: string) => void;
  onStats?: (fps: number) => void;
  onCursor?: (lat: number | null, lon: number | null) => void;
  layer: TileLayer;
  tilesEnabled: boolean;
  pin: [number, number] | null;
}) {
  const cfg = TIER_CONFIG[tier];
  const reduced = useMemo(() => prefersReducedMotion(), []);
  const sunDir = useMemo(() => new THREE.Vector3(5, 2.2, 3.4).normalize(), []);
  const frames = useRef(0);
  const acc = useRef(0);

  useFrame((_, dt) => {
    frames.current++; acc.current += dt;
    if (onStats && acc.current >= 0.5) { onStats(Math.round(frames.current / acc.current)); frames.current = 0; acc.current = 0; }
  });

  return (
    <>
      <Rig scrollRef={scrollRef} distTargetRef={distTargetRef} distRef={distRef} />
      <Starfield count={cfg.stars} />
      <WorldGroup reduced={reduced} dragRef={dragRef} tier={tier} scrollRef={scrollRef} flyRef={flyRef}>
        <Earth segments={cfg.sphereSegments} sunDir={sunDir} onCursor={onCursor} />
        <Graticule />
        <EntityBeacons reduced={reduced} />
        <Atmosphere />
        <OrbitalRings count={cfg.rings} reduced={reduced} />
        <Arcs nodes={DIVISION_NODES} pulses={cfg.pulses} reduced={reduced} />
        <DivisionNodes nodes={DIVISION_NODES} labels={cfg.labels} reduced={reduced} onSelect={onSelect} />
        {pin && <PinMarker lat={pin[0]} lon={pin[1]} />}
      </WorldGroup>
      {tilesEnabled && <TileSphere layer={layer} distRef={distRef} active />}
      {cfg.particles > 0 && <Dust count={cfg.particles} reduced={reduced} />}
      {cfg.bloom && !reduced && <BloomPass />}
    </>
  );
}

export function EarthScene({ tier, frameloop, scrollRef, distTargetRef, distRef, flyRef, dragRef, onSelect, onStats, onCursor, layer, tilesEnabled, pin }: {
  tier: QualityTier;
  frameloop: 'always' | 'demand' | 'never';
  scrollRef: React.RefObject<number>;
  distTargetRef: React.RefObject<number>;
  distRef: React.RefObject<number>;
  flyRef: React.RefObject<{ lat: number; lon: number; token: number } | null>;
  dragRef: React.RefObject<{ dx: number; vel: number; dragging: boolean }>;
  onSelect: (route: string) => void;
  onStats?: (fps: number) => void;
  onCursor?: (lat: number | null, lon: number | null) => void;
  layer: TileLayer;
  tilesEnabled: boolean;
  pin: [number, number] | null;
}) {
  const cfg = TIER_CONFIG[tier];
  const reduced = typeof window !== 'undefined' && prefersReducedMotion();
  return (
    <Canvas
      className="globe-canvas"
      dpr={cfg.dpr}
      frameloop={reduced ? 'demand' : frameloop}
      camera={{ position: [0, 0.12, 3.15], fov: 42 }}
      gl={{ antialias: tier !== 'low', alpha: true, powerPreference: 'high-performance' }}
      onWheel={(e) => {
        const next = (distTargetRef.current ?? 3.15) * Math.exp(e.deltaY * 0.0011);
        distTargetRef.current = Math.min(3.6, Math.max(1.004, next));
      }}
    >
      <Scene tier={tier} scrollRef={scrollRef} distTargetRef={distTargetRef} distRef={distRef} flyRef={flyRef} dragRef={dragRef} onSelect={onSelect} onStats={onStats} onCursor={onCursor} layer={layer} tilesEnabled={tilesEnabled} pin={pin} />
    </Canvas>
  );
}
