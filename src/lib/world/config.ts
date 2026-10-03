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
  { id: 'blog', title: 'Blog', titleNe: 'ब्लग', category: 'division', position: { lat: 48.856, lon: 2.352 }, destination: '/blog', cameraPreset: 'CAMERA_HOME', icon: 'doc', description: 'Digital editorial — articles from the Acttolog world.', enabled: true },
  { id: 'ai', title: 'Acttolog AI', titleNe: 'एक्टोलग एआई', category: 'division', position: { lat: 37.774, lon: -122.419 }, destination: '/ai', cameraPreset: 'CAMERA_HOME', icon: 'brain', description: 'Intelligence dock — ask about any place or topic.', enabled: true },
  { id: 'earth', title: 'Earth Command', titleNe: 'पृथ्वी कमान्ड', category: 'world', position: { lat: 27.717, lon: 85.324 }, destination: '/explore?mode=earth', cameraPreset: 'CAMERA_EARTH', icon: 'globe', description: 'The immersive globe — EARTH · MAP · SAT · 360.', enabled: true },
  { id: 'everest', title: 'Mount Everest', titleNe: 'सगरमाथा', category: 'place', position: { lat: 27.988, lon: 86.925 }, destination: '/explore?lat=27.988&lng=86.925&mode=sat&zoom=11', cameraPreset: 'CAMERA_SAT', icon: 'compass', description: 'Sagarmatha — the highest point on Earth.', enabled: true },
  { id: 'pokhara', title: 'Pokhara', titleNe: 'पोखरा', category: 'place', position: { lat: 28.209, lon: 83.985 }, destination: '/explore?lat=28.209&lng=83.985&mode=map&zoom=12', cameraPreset: 'CAMERA_MAP', icon: 'home', description: 'Lake city beneath the Annapurnas.', enabled: true },
];

/**
 * Curated discovery cards (spec §25 — EXPLORE). Real places, real
 * coordinates; nothing invented. Categories drive the discovery filter.
 */
export type DiscoveryCategory = 'cities' | 'landmarks' | 'nature' | 'culture' | 'education' | 'science' | 'technology' | 'entertainment';

export interface DiscoveryCard {
  id: string;
  name: string;
  nameNe?: string;
  country: string;
  category: DiscoveryCategory;
  lat: number;
  lon: number;
  mode: 'earth' | 'map' | 'sat';
  zoom: number;
  blurb: string;
}

export const DISCOVERY_CARDS: DiscoveryCard[] = [
  { id: 'kathmandu', name: 'Kathmandu', nameNe: 'काठमाडौं', country: 'Nepal', category: 'cities', lat: 27.7172, lon: 85.324, mode: 'map', zoom: 13, blurb: 'Capital of Nepal — the ACTTOLOG home base.' },
  { id: 'pokhara', name: 'Pokhara', nameNe: 'पोखरा', country: 'Nepal', category: 'cities', lat: 28.2096, lon: 83.9856, mode: 'map', zoom: 12, blurb: 'Lake city beneath the Annapurna range.' },
  { id: 'everest', name: 'Mount Everest', nameNe: 'सगरमाथा', country: 'Nepal · China', category: 'nature', lat: 27.9881, lon: 86.925, mode: 'sat', zoom: 11, blurb: 'Sagarmatha — 8,848.86 m, the highest point on Earth.' },
  { id: 'lumbini', name: 'Lumbini', nameNe: 'लुम्बिनी', country: 'Nepal', category: 'culture', lat: 27.4833, lon: 83.2767, mode: 'sat', zoom: 13, blurb: 'Birthplace of Lord Buddha — UNESCO World Heritage.' },
  { id: 'tokyo', name: 'Tokyo', country: 'Japan', category: 'cities', lat: 35.6762, lon: 139.6503, mode: 'map', zoom: 12, blurb: 'The world\u2019s largest metropolis.' },
  { id: 'london', name: 'London', country: 'United Kingdom', category: 'cities', lat: 51.5074, lon: -0.1278, mode: 'map', zoom: 12, blurb: 'Historic capital on the Thames.' },
  { id: 'paris', name: 'Paris', country: 'France', category: 'cities', lat: 48.8566, lon: 2.3522, mode: 'map', zoom: 12, blurb: 'City of light, art and science.' },
  { id: 'newyork', name: 'New York', country: 'United States', category: 'cities', lat: 40.7128, lon: -74.006, mode: 'map', zoom: 12, blurb: 'The vertical city.' },
  { id: 'giza', name: 'Pyramids of Giza', country: 'Egypt', category: 'landmarks', lat: 29.9792, lon: 31.1342, mode: 'sat', zoom: 14, blurb: 'Ancient wonders on the Giza plateau.' },
  { id: 'taj', name: 'Taj Mahal', country: 'India', category: 'landmarks', lat: 27.1751, lon: 78.0421, mode: 'sat', zoom: 15, blurb: 'Mughal marble mausoleum in Agra.' },
  { id: 'grandcanyon', name: 'Grand Canyon', country: 'United States', category: 'nature', lat: 36.1069, lon: -112.1129, mode: 'sat', zoom: 11, blurb: 'A mile-deep gorge carved by the Colorado River.' },
  { id: 'greatbarrier', name: 'Great Barrier Reef', country: 'Australia', category: 'nature', lat: -18.2871, lon: 147.6992, mode: 'sat', zoom: 9, blurb: 'The largest living structure on the planet.' },
  { id: 'mit', name: 'MIT', country: 'United States', category: 'education', lat: 42.3601, lon: -71.0942, mode: 'map', zoom: 15, blurb: 'Massachusetts Institute of Technology, Cambridge.' },
  { id: 'oxford', name: 'University of Oxford', country: 'United Kingdom', category: 'education', lat: 51.7548, lon: -1.2544, mode: 'map', zoom: 14, blurb: 'The oldest university in the English-speaking world.' },
  { id: 'cern', name: 'CERN', country: 'Switzerland · France', category: 'science', lat: 46.2330, lon: 6.0557, mode: 'sat', zoom: 14, blurb: 'European nuclear research centre — the LHC.' },
  { id: 'siliconvalley', name: 'Silicon Valley', country: 'United States', category: 'technology', lat: 37.3861, lon: -122.0839, mode: 'map', zoom: 11, blurb: 'The global heart of technology.' },
  { id: 'hollywood', name: 'Hollywood', country: 'United States', category: 'entertainment', lat: 34.0928, lon: -118.3287, mode: 'map', zoom: 13, blurb: 'The film capital of the world.' },
  { id: 'durbarsquare', name: 'Kathmandu Durbar Square', nameNe: 'काठमाडौं दरबार स्क्वायर', country: 'Nepal', category: 'culture', lat: 27.7045, lon: 85.3070, mode: 'sat', zoom: 16, blurb: 'Royal palace complex — UNESCO World Heritage.' },
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

/**
 * ACTTOLOG-owned 360 worlds. `pano` = generated equirectangular environment
 * (field worlds you can travel — university, library, lab, museum); worlds
 * without `pano` stay fully procedural. Google Street View remains NOT
 * CONFIGURED until a Maps key exists. Every world carries the founder-guide.
 */
export const WORLDS_360 = [
  { id: 'world', name: 'ACTTOLOG World', palette: ['#04060f', '#35e0ff', '#7c5cff', '#ff4ecd'] },
  { id: 'university', name: 'University Visit', palette: ['#04080f', '#35e0ff', '#7c5cff', '#9be8ff'], pano: '/media/pano/university.jpg' },
  { id: 'lab', name: 'Research Lab', palette: ['#04080f', '#35e0ff', '#4f7dff', '#9be8ff'], pano: '/media/pano/lab.jpg' },
  { id: 'library', name: 'Digital Library', palette: ['#07080c', '#e8eeff', '#7c5cff', '#35e0ff'], pano: '/media/pano/library.jpg' },
  { id: 'museum', name: 'Museum Gallery', palette: ['#0a0610', '#ff4ecd', '#7c5cff', '#35e0ff'], pano: '/media/pano/museum.jpg' },
  { id: 'darkroom', name: 'Darkroom', palette: ['#0a0805', '#f5c26b', '#35e0ff', '#ff4ecd'] },
  { id: 'arena', name: 'Games Arena', palette: ['#04120a', '#3ddc97', '#35e0ff', '#7c5cff'] },
  { id: 'academy', name: 'Academy', palette: ['#05081a', '#7c5cff', '#35e0ff', '#c9b6ff'] },
  { id: 'cinema', name: 'Entertainment', palette: ['#0c0409', '#ff4ecd', '#f5c26b', '#35e0ff'] },
  { id: 'blog', name: 'Editorial', palette: ['#06070d', '#9be8ff', '#7c5cff', '#e8eeff'] },
  { id: 'offers', name: 'Offers Showcase', palette: ['#0b0704', '#f5c26b', '#ff9d4e', '#35e0ff'] },
  { id: 'ai', name: 'Intelligence Core', palette: ['#03060e', '#35e0ff', '#3ddc97', '#7c5cff'] },
  { id: 'contact', name: 'Global Contact', palette: ['#040610', '#4f7dff', '#35e0ff', '#c9b6ff'] },
] as const;

/** Registry of world ids for validation (config-driven, spec §46 expansion). */
export const WORLD_360_IDS = WORLDS_360.map((w) => w.id as string);
