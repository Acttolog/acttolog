'use client';

import { useEffect, useState } from 'react';
import { DEFAULT_SCENE, CAMERA_PRESETS, WORLD_NODES, type SceneConfig } from '@/lib/world/config';
import { Icon } from '@/components/ui/Icon';
import { useToast } from '@/lib/toast';

/**
 * Structured scene editor (spec §43). No arbitrary code: typed fields only.
 * Without a database, edits are preview-local (localStorage) and exportable
 * as JSON for the CMS; with DATABASE_URL they persist via /api/admin/scene.
 */
export function SceneEditorClient() {
  const [cfg, setCfg] = useState<SceneConfig>(DEFAULT_SCENE);
  const toast = useToast();

  useEffect(() => {
    try {
      const raw = localStorage.getItem('act_scene_preview');
      if (raw) setCfg({ ...DEFAULT_SCENE, ...JSON.parse(raw) });
    } catch { /* ignore */ }
  }, []);

  const set = <K extends keyof SceneConfig>(k: K, v: SceneConfig[K]) => {
    const next = { ...cfg, [k]: v };
    setCfg(next);
    try { localStorage.setItem('act_scene_preview', JSON.stringify(next)); } catch { /* ignore */ }
  };

  const Num = ({ label, value, min, max, step, on }: { label: string; value: number; min: number; max: number; step: number; on: (v: number) => void }) => (
    <label className="fld">
      <span>{label} — {value}</span>
      <input type="range" min={min} max={max} step={step} value={value} style={{ width: '100%', accentColor: 'var(--cy)' }}
        onChange={(e) => on(Number(e.target.value))} />
    </label>
  );

  return (
    <div className="grid lg:grid-cols-[1fr_360px] gap-5 items-start">
      <div className="space-y-5">
        <div className="panel p-6">
          <div className="mono text-[9.7px] tracking-[.2em] dim mb-4">SCENE</div>
          <div className="grid sm:grid-cols-2 gap-x-6">
            <label className="flex items-center justify-between gap-3 mb-3 text-[13.2px]">
              <span className="mut">Enabled</span>
              <button className={`sw${cfg.enabled ? ' on' : ''}`} aria-label="Scene enabled"
                onClick={() => set('enabled', !cfg.enabled)} />
            </label>
            <label className="fld"><span>Model</span>
              <select className="sel" value={cfg.model} onChange={(e) => set('model', e.target.value)}>
                <option value="acttolog-earth-native">acttolog-earth-native</option>
                <option value="acttolog-earth-tiles">acttolog-earth-tiles</option>
              </select>
            </label>
            <Num label="Scale" value={cfg.scale} min={0.5} max={2} step={0.05} on={(v) => set('scale', v)} />
            <Num label="Opacity" value={cfg.opacity} min={0.2} max={1} step={0.05} on={(v) => set('opacity', v)} />
            <Num label="Particles" value={cfg.particles} min={0} max={1200} step={50} on={(v) => set('particles', v)} />
            <label className="fld"><span>Quality default</span>
              <select className="sel" value={cfg.qualityDefault}
                onChange={(e) => set('qualityDefault', e.target.value as SceneConfig['qualityDefault'])}>
                {['auto', 'high', 'medium', 'low'].map((q) => <option key={q}>{q}</option>)}
              </select>
            </label>
          </div>
        </div>

        <div className="panel p-6">
          <div className="mono text-[9.7px] tracking-[.2em] dim mb-4">ANIMATION · CAMERA · LIGHTING</div>
          <div className="grid sm:grid-cols-2 gap-x-6">
            <label className="flex items-center justify-between gap-3 mb-3 text-[13.2px]">
              <span className="mut">Auto-rotate</span>
              <button className={`sw${cfg.animation.autoRotate ? ' on' : ''}`} aria-label="Auto rotate"
                onClick={() => set('animation', { ...cfg.animation, autoRotate: !cfg.animation.autoRotate })} />
            </label>
            <label className="flex items-center justify-between gap-3 mb-3 text-[13.2px]">
              <span className="mut">Vertical wobble</span>
              <button className={`sw${cfg.animation.wobble ? ' on' : ''}`} aria-label="Wobble"
                onClick={() => set('animation', { ...cfg.animation, wobble: !cfg.animation.wobble })} />
            </label>
            <Num label="Rotation speed" value={cfg.animation.speed} min={0} max={1.5} step={0.05}
              on={(v) => set('animation', { ...cfg.animation, speed: v })} />
            <Num label="Field of view" value={cfg.camera.fov} min={25} max={75} step={1}
              on={(v) => set('camera', { ...cfg.camera, fov: v })} />
            <Num label="Ambient light" value={cfg.lighting.ambient} min={0} max={1.5} step={0.05}
              on={(v) => set('lighting', { ...cfg.lighting, ambient: v })} />
            <Num label="Sun intensity" value={cfg.lighting.sun} min={0} max={2.5} step={0.05}
              on={(v) => set('lighting', { ...cfg.lighting, sun: v })} />
            <label className="fld sm:col-span-2"><span>Camera preset</span>
              <select className="sel" value={cfg.camera.preset}
                onChange={(e) => set('camera', { ...cfg.camera, preset: e.target.value as SceneConfig['camera']['preset'] })}>
                {CAMERA_PRESETS.map((c) => <option key={c.id}>{c.id}</option>)}
              </select>
            </label>
          </div>
        </div>

        <div className="panel p-6">
          <div className="mono text-[9.7px] tracking-[.2em] dim mb-4">ENVIRONMENT · INTERACTION · VISIBILITY</div>
          <div className="grid sm:grid-cols-3 gap-3 mb-4">
            {(['stars', 'dust', 'atmosphere'] as const).map((k) => (
              <label key={k} className="flex items-center justify-between gap-3 text-[13.2px]">
                <span className="mut capitalize">{k}</span>
                <button className={`sw${cfg.environment[k] ? ' on' : ''}`} aria-label={k}
                  onClick={() => set('environment', { ...cfg.environment, [k]: !cfg.environment[k] })} />
              </label>
            ))}
            {(['drag', 'wheelZoom', 'pointerReadout'] as const).map((k) => (
              <label key={k} className="flex items-center justify-between gap-3 text-[13.2px]">
                <span className="mut">{k}</span>
                <button className={`sw${cfg.interaction[k] ? ' on' : ''}`} aria-label={k}
                  onClick={() => set('interaction', { ...cfg.interaction, [k]: !cfg.interaction[k] })} />
              </label>
            ))}
            {(['mobile', 'tablet', 'desktop'] as const).map((k) => (
              <label key={k} className="flex items-center justify-between gap-3 text-[13.2px]">
                <span className="mut capitalize">{k}</span>
                <button className={`sw${cfg.breakpointVisibility[k] ? ' on' : ''}`} aria-label={k}
                  onClick={() => set('breakpointVisibility', { ...cfg.breakpointVisibility, [k]: !cfg.breakpointVisibility[k] })} />
              </label>
            ))}
          </div>
          <div className="flex flex-wrap gap-2.5">
            <button className="btn btn-g btn-sm"
              onClick={() => {
                navigator.clipboard?.writeText(JSON.stringify(cfg, null, 2));
                toast('Scene config JSON copied — paste into CMS when the database is connected.', 'ok', 5000);
              }}>
              <Icon name="down" size={14} />Export JSON
            </button>
            <button className="btn btn-g btn-sm" onClick={() => { setCfg(DEFAULT_SCENE); localStorage.removeItem('act_scene_preview'); toast('Reset to defaults.', 'info'); }}>
              <Icon name="refresh" size={14} />Reset
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-5">
        <div className="panel p-6">
          <div className="mono text-[9.7px] tracking-[.2em] dim mb-4">WORLD NODES</div>
          <div className="space-y-2">
            {WORLD_NODES.map((n) => (
              <div key={n.id} className="rounded-xl border p-3.5" style={{ borderColor: 'var(--line)', background: 'var(--panel2)' }}>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-display font-semibold text-[13px]">{n.title}</span>
                  <span className={`badge ${n.enabled ? 'b-ok' : 'b-mut'}`}>{n.enabled ? 'on' : 'off'}</span>
                </div>
                <div className="dim mono text-[9.6px] tracking-[.14em] mt-1">
                  {n.position.lat.toFixed(2)}, {n.position.lon.toFixed(2)} · {n.cameraPreset}
                </div>
              </div>
            ))}
          </div>
          <p className="dim text-[11.4px] mt-4 leading-relaxed">
            Node editing (add/move/disable) persists with the CMS database. Positions drive both the hero globe and /explore camera presets.
          </p>
        </div>
        <div className="panel p-6">
          <div className="mono text-[9.7px] tracking-[.2em] dim mb-4">PREVIEW STATE</div>
          <p className="mut text-[12.6px] leading-relaxed">
            Edits apply to this browser as a preview and are exportable as structured JSON.
            Production-wide changes require the CMS database (NOT CONFIGURED until DATABASE_URL is connected).
          </p>
        </div>
      </div>
    </div>
  );
}
