/**
 * ACTTOLOG World registry — WorldNodes, camera presets and structured
 * SceneConfig (spec §19, §88). Values live here (config, not components)
 * and surface in /admin/scene; CMS/DB persistence activates with DATABASE_URL.
 */

export interface WorldNode {
  id: string;
  title: string;
  titleNe?: string;
  category: 'division' | 'place' | 'world';
  position: { lat: number; lon: number };
  destination: string;
  cameraPreset: CameraPresetId;
  icon: string;
  description: string;
  enabled: boolean;
}

export type CameraPresetId =
  | 'CAMERA_HOME' | 'CAMERA_EARTH' | 'CAMERA_MAP' | 'CAMERA_SAT' | 'CAMERA_360'
  | 'CAMERA_RESEARCH' | 'CAMERA_ACADEMY' | 'CAMERA_GAMES' | 'CAMERA_DARKROOM';

export interface CameraPreset {
  id: CameraPresetId;
  distance: number;   // globe radii (1.0 = surface)
  lat: number | null; // null = keep current
  lon: number | null;
  layer: 'blue' | 'map' | 'sat';
  mode: 'earth' | 'map' | 'sat' | '360';
}

export interface SceneConfig {
  enabled: boolean;
  model: string;
  position: [number, number, number];
  rotation: [number, number, number];
  scale: number;
  opacity: number;
  animation: { autoRotate: boolean; speed: number; wobble: boolean };
  camera: { fov: number; near: number; far: number; preset: CameraPresetId };
  lighting: { ambient: number; sun: number };
  environment: { stars: boolean; dust: boolean; atmosphere: boolean };
  particles: number;
  interaction: { drag: boolean; wheelZoom: boolean; pointerReadout: boolean };
  breakpointVisibility: { mobile: boolean; tablet: boolean; desktop: boolean };
  qualityDefault: 'auto' | 'high' | 'medium' | 'low';
}

export const CAMERA_PRESETS: CameraPreset[] = [
  { id: 'CAMERA_HOME', distance: 3.15, lat: null, lon: null, layer: 'blue', mode: 'earth' },
  { id: 'CAMERA_EARTH', distance: 2.2, lat: 27.717, lon: 85.324, layer: 'blue', mode: 'earth' },
  { id: 'CAMERA_MAP', distance: 1.02, lat: 27.717, lon: 85.324, layer: 'map', mode: 'map' },
  { id: 'CAMERA_SAT', distance: 1.02, lat: 27.717, lon: 85.324, layer: 'sat', mode: 'sat' },
  { id: 'CAMERA_360', distance: 1.0, lat: null, lon: null, layer: 'map', mode: '360' },
  { id: 'CAMERA_RESEARCH', distance: 1.6, lat: 27.717, lon: 85.324, layer: 'blue', mode: 'earth' },
  { id: 'CAMERA_ACADEMY', distance: 1.9, lat: 42.361, lon: -71.058, layer: 'blue', mode: 'earth' },
  { id: 'CAMERA_GAMES', distance: 1.9, lat: 35.681, lon: 139.767, layer: 'blue', mode: 'earth' },
  { id: 'CAMERA_DARKROOM', distance: 1.9, lat: 52.52, lon: 13.405, layer: 'blue', mode: 'earth' },
];

export const WORLD_NODES: WorldNode[] = [
  { id: 'research', title: 'Thesyn Research', titleNe: 'थेसिन रिसर्च', category: 'division', position: { lat: 27.717, lon: 85.324 }, destination: '/research', cameraPreset: 'CAMERA_RESEARCH', icon: 'sigma', description: 'Research & academic support — topic to viva.', enabled: true },
  { id: 'academy', title: 'Academy', titleNe: 'एकेडेमी', category: 'division', position: { lat: 42.361, lon: -71.058 }, destination: '/academy', cameraPreset: 'CAMERA_ACADEMY', icon: 'book', description: 'Courses, modules, lessons, resources.', enabled: true },
  { id: 'games', title: 'Games', titleNe: 'खेलहरू', category: 'division', position: { lat: 35.681, lon: 139.767 }, destination: '/games', cameraPreset: 'CAMERA_GAMES', icon: 'game', description: 'Interactive experiences & play.', enabled: true },
  { id: 'darkroom', title: 'Darkroom', titleNe: 'डार्करूम', category: 'division', position: { lat: 52.52, lon: 13.405 }, destination: '/darkroom', cameraPreset: 'CAMERA_DARKROOM', icon: 'search', description: 'Verified digital discovery hub.', enabled: true },
  { id: 'entertainment', title: 'Entertainment', titleNe: 'मनोरञ्जन', category: 'division', position: { lat: 34.052, lon: -118.244 }, destination: '/entertainment', cameraPreset: 'CAMERA_HOME', icon: 'play', description: 'Stories & digital media.', enabled: true },
  { id: 'everest', title: 'Mount Everest', titleNe: 'सगरमाथा', category: 'place', position: { lat: 27.988, lon: 86.925 }, destination: '/explore?lat=27.988&lng=86.925&mode=sat&zoom=11', cameraPreset: 'CAMERA_SAT', icon: 'compass', description: 'Sagarmatha — the highest point on Earth.', enabled: true },
  { id: 'pokhara', title: 'Pokhara', titleNe: 'पोखरा', category: 'place', position: { lat: 28.209, lon: 83.985 }, destination: '/explore?lat=28.209&lng=83.985&mode=map&zoom=12', cameraPreset: 'CAMERA_MAP', icon: 'home', description: 'Lake city beneath the Annapurnas.', enabled: true },
];

export const DEFAULT_SCENE: SceneConfig = {
  enabled: true,
  model: 'acttolog-earth-native',
  position: [0, 0, 0],
  rotation: [0.16, 0, 0],
  scale: 1,
  opacity: 1,
  animation: { autoRotate: true, speed: 0.35, wobble: true },
  camera: { fov: 42, near: 0.00002, far: 500, preset: 'CAMERA_HOME' },
  lighting: { ambient: 0.55, sun: 1.25 },
  environment: { stars: true, dust: true, atmosphere: true },
  particles: 700,
  interaction: { drag: true, wheelZoom: true, pointerReadout: true },
  breakpointVisibility: { mobile: true, tablet: true, desktop: true },
  qualityDefault: 'auto',
};

/** ACTTOLOG-owned 360 worlds (procedural; Google Street View = NOT CONFIGURED). */
export const WORLDS_360 = [
  { id: 'world', name: 'ACTTOLOG World', palette: ['#04060f', '#35e0ff', '#7c5cff', '#ff4ecd'] },
  { id: 'lab', name: 'Research Lab', palette: ['#04080f', '#35e0ff', '#4f7dff', '#9be8ff'] },
  { id: 'library', name: 'Digital Library', palette: ['#07080c', '#e8eeff', '#7c5cff', '#35e0ff'] },
  { id: 'darkroom', name: 'Darkroom', palette: ['#0a0805', '#f5c26b', '#35e0ff', '#ff4ecd'] },
  { id: 'arena', name: 'Games Arena', palette: ['#04120a', '#3ddc97', '#35e0ff', '#7c5cff'] },
  { id: 'academy', name: 'Academy', palette: ['#05081a', '#7c5cff', '#35e0ff', '#c9b6ff'] },
] as const;
