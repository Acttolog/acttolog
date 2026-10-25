'use client';

import { useEffect, useState } from 'react';
import { DEFAULT_SCENE, type SceneConfig } from './config';

export const SCENE_PREVIEW_KEY = 'act_scene_preview';
/** Same-tab signal so the globe reacts without a reload. */
export const SCENE_PREVIEW_EVENT = 'acttolog:scene';

function normalize(raw: unknown): SceneConfig | null {
  if (!raw || typeof raw !== 'object') return null;
  const p = raw as Partial<SceneConfig>;
  return {
    ...DEFAULT_SCENE,
    ...p,
    animation: { ...DEFAULT_SCENE.animation, ...p.animation },
    camera: { ...DEFAULT_SCENE.camera, ...p.camera },
    lighting: { ...DEFAULT_SCENE.lighting, ...p.lighting },
    environment: { ...DEFAULT_SCENE.environment, ...p.environment },
    interaction: { ...DEFAULT_SCENE.interaction, ...p.interaction },
    breakpointVisibility: { ...DEFAULT_SCENE.breakpointVisibility, ...p.breakpointVisibility },
    nodes: p.nodes && typeof p.nodes === 'object' && !Array.isArray(p.nodes) ? p.nodes : {},
  };
}

function readPreview(): SceneConfig | null {
  try {
    const raw = localStorage.getItem(SCENE_PREVIEW_KEY);
    return raw ? normalize(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

/** Scene overrides saved by /admin/scene — this browser only, null when none. */
export function useScenePreview(): SceneConfig | null {
  const [preview, setPreview] = useState<SceneConfig | null>(null);

  useEffect(() => {
    const sync = () => setPreview(readPreview());
    sync();
    window.addEventListener('storage', sync);
    window.addEventListener(SCENE_PREVIEW_EVENT, sync);
    return () => {
      window.removeEventListener('storage', sync);
      window.removeEventListener(SCENE_PREVIEW_EVENT, sync);
    };
  }, []);

  return preview;
}
