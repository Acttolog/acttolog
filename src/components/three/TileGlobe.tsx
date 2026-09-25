'use client';

/**
 * TileGlobe — quadtree-tiled Earth explorer (original implementation).
 * Zooms seamlessly from space imagery to street/house level using open
 * tile services (© OpenStreetMap contributors, © CARTO, imagery © Esri).
 * Patches are frustum-culled by angular footprint; geometries and textures
 * are LRU-cached and disposed on zoom-out. No code or assets copied from
 * any reference site.
 */

import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { latLonToVec3 } from './EarthScene';

export type TileLayer = 'map' | 'sat';

const TILE_SOURCES: Record<TileLayer, (z: number, x: number, y: number) => string> = {
  map: (z, x, y) => `https://${'abc'[(x + y) % 3]}.tile.openstreetmap.org/${z}/${x}/${y}.png`,
  sat: (z, x, y) => `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${z}/${y}/${x}`,
};

export const TILE_ATTRIBUTION: Record<TileLayer, string> = {
  map: '© OpenStreetMap contributors',
  sat: 'Imagery © Esri, Maxar, Earthstar Geographics',
};

const R = 1.002; // above base Earth, below graticule
const SECTOR_SEG = 14;

function tileBounds(z: number, x: number, y: number) {
  const n = Math.PI * (1 - (2 * y) / 2 ** z);
  const lat1 = (Math.atan(Math.sinh(n)) * 180) / Math.PI;
  const n2 = Math.PI * (1 - (2 * (y + 1)) / 2 ** z);
  const lat0 = (Math.atan(Math.sinh(n2)) * 180) / Math.PI;
  const lon0 = (x / 2 ** z) * 360 - 180;
  const lon1 = ((x + 1) / 2 ** z) * 360 - 180;
  return { lat0, lat1, lon0, lon1 };
}

const geoCache = new Map<string, THREE.BufferGeometry>();
function sectorGeometry(key: string, b: { lat0: number; lat1: number; lon0: number; lon1: number }) {
  const hit = geoCache.get(key);
  if (hit) return hit;
  const pos: number[] = [];
  const uv: number[] = [];
  const idx: number[] = [];
  for (let iy = 0; iy <= SECTOR_SEG; iy++) {
    const lat = b.lat0 + ((b.lat1 - b.lat0) * iy) / SECTOR_SEG;
    for (let ix = 0; ix <= SECTOR_SEG; ix++) {
      const lon = b.lon0 + ((b.lon1 - b.lon0) * ix) / SECTOR_SEG;
      const v = latLonToVec3(lat, lon, R);
      pos.push(v.x, v.y, v.z);
      uv.push(ix / SECTOR_SEG, iy / SECTOR_SEG);
    }
  }
  for (let iy = 0; iy < SECTOR_SEG; iy++) {
    for (let ix = 0; ix < SECTOR_SEG; ix++) {
      const a = iy * (SECTOR_SEG + 1) + ix;
      const b2 = a + SECTOR_SEG + 1;
      idx.push(a, b2, a + 1, b2, b2 + 1, a + 1);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  if (geoCache.size > 900) {
    // drop oldest (insertion order) beyond cap
    const first = geoCache.keys().next().value as string;
    geoCache.get(first)?.dispose();
    geoCache.delete(first);
  }
  geoCache.set(key, g);
  return g;
}

interface Patch {
  key: string; z: number; x: number; y: number;
  mesh: THREE.Mesh; tex: THREE.Texture | null; loaded: boolean;
}

export function TileSphere({ layer, distRef, active }: {
  layer: TileLayer;
  distRef: React.RefObject<number>;
  active: boolean;
}) {
  const group = useRef<THREE.Group>(null);
  const patches = useRef<Map<string, Patch>>(new Map());
  const { gl } = useThree();
  const loader = useMemo(() => new THREE.TextureLoader().setCrossOrigin('anonymous'), []);
  const stateRef = useRef({ z: -1, layer, camDir: new THREE.Vector3() });
  const wantedRef = useRef<Set<string>>(new Set());

  // target zoom level from camera altitude: ~4 tiles across the view
  // footprint → z≈14 (houses/roads) at street approach, z2-4 from orbit
  const zoomFor = (d: number) => {
    const h = Math.max(0.00004, d - R); // altitude above the tile shell
    const thetaRad = Math.atan(h * 0.384); // view footprint radius (rad)
    const theta = (thetaRad * 180) / Math.PI;
    return Math.max(2, Math.min(18, Math.floor(Math.log2(360 / Math.max(0.002, theta * 0.25)))));
  };

  useEffect(() => {
    stateRef.current.layer = layer;
    // drop patches of other layer
    for (const [k, p] of patches.current) {
      if (!k.startsWith(layer + ':')) {
        p.tex?.dispose();
        p.mesh.material && (p.mesh.material as THREE.Material).dispose();
        group.current?.remove(p.mesh);
        patches.current.delete(k);
      }
    }
  }, [layer]);

  useEffect(() => () => {
    for (const [, p] of patches.current) {
      p.tex?.dispose();
      (p.mesh.material as THREE.Material).dispose();
    }
    patches.current.clear();
  }, []);

  useFrame(({ camera }) => {
    if (!active || !group.current) return;
    const d = distRef.current ?? 3.15;
    if (d > 2.45) return; // tiles only engage when approaching the surface
    const z = zoomFor(d);
    const camLocal = group.current.parent
      ? group.current.parent.worldToLocal(camera.position.clone()).normalize()
      : camera.position.clone().normalize();
    const st = stateRef.current;

    if (z !== st.z || camLocal.angleTo(st.camDir) >= 0.02) {
      st.z = z; st.camDir.copy(camLocal);
      const thetaRad = Math.atan(Math.max(0.00004, d - R) * 0.384);
      const cosLimit = Math.cos(Math.min(Math.PI * 0.98, thetaRad * 6));
      const n = 2 ** z;
      const lat = 90 - (Math.acos(THREE.MathUtils.clamp(camLocal.y, -1, 1)) * 180) / Math.PI;
      let lon = (Math.atan2(camLocal.z, -camLocal.x) * 180) / Math.PI - 180;
      if (lon < -180) lon += 360;
      const yF = ((1 - Math.log(Math.tan((lat * Math.PI) / 180) + 1 / Math.cos((lat * Math.PI) / 180)) / Math.PI) / 2) * n;
      const xF = ((lon + 180) / 360) * n;
      const span = Math.max(2, Math.min(24, Math.ceil((n * thetaRad * 3) / Math.PI) + 3));
      const wanted = new Set<string>();
      for (let dy = -span; dy <= span; dy++) {
        for (let dx = -span; dx <= span; dx++) {
          const x = (Math.floor(xF) + dx + n * 4) % n;
          const y = Math.floor(yF) + dy;
          if (y < 0 || y >= n) continue;
          const b = tileBounds(z, x, y);
          const c = latLonToVec3((b.lat0 + b.lat1) / 2, (b.lon0 + b.lon1) / 2, 1).normalize();
          if (c.dot(camLocal) < cosLimit) continue;
          const key = `${layer}:${z}/${x}/${y}`;
          wanted.add(key);
          if (patches.current.has(key)) continue;
          const geo = sectorGeometry(`g:${z}/${x}/${y}`, b);
          const mat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, toneMapped: false, depthWrite: true, side: THREE.DoubleSide });
          const mesh = new THREE.Mesh(geo, mat);
          mesh.renderOrder = 5;
          group.current.add(mesh);
          const patch: Patch = { key, z, x, y, mesh, tex: null, loaded: false };
          patches.current.set(key, patch);
          loader.load(TILE_SOURCES[layer](z, x, y), (tex) => {
            tex.colorSpace = THREE.SRGBColorSpace;
            tex.anisotropy = 2;
            patch.tex = tex;
            patch.loaded = true;
            mat.map = tex;
            mat.needsUpdate = true;
          }, undefined, () => { patch.loaded = true; });
        }
      }
      wantedRef.current = wanted;
    }

    // per-frame fade in/out using the cached wanted set
    const wantedNow = wantedRef.current;
    for (const [k, p] of patches.current) {
      const mat = p.mesh.material as THREE.MeshBasicMaterial;
      if (!wantedNow.has(k)) {
        mat.opacity -= 0.15;
        if (mat.opacity <= 0) {
          p.tex?.dispose(); mat.dispose();
          group.current.remove(p.mesh);
          patches.current.delete(k);
        }
      } else if (p.loaded) {
        mat.opacity = Math.min(1, mat.opacity + 0.15);
      }
    }
    if (patches.current.size > 700) {
      const it = patches.current.keys();
      for (let i = 0; i < 120; i++) {
        const k = it.next().value as string;
        const p = patches.current.get(k);
        if (p && !wantedNow.has(k)) {
          p.tex?.dispose(); (p.mesh.material as THREE.Material).dispose();
          group.current.remove(p.mesh);
          patches.current.delete(k);
        }
      }
    }
    if (typeof window !== 'undefined') {
      (window as unknown as Record<string, unknown>).__atlTiles = {
        count: patches.current.size, wanted: wantedRef.current.size, z: stateRef.current.z, d,
        sampleOp: (() => { const first = patches.current.values().next().value as Patch | undefined; return first ? +((first.mesh.material as THREE.MeshBasicMaterial).opacity.toFixed(2)) : -1; })(),
      };
    }
    void gl;
  });

  return <group ref={group} />;
}
