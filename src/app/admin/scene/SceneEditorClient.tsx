'use client';

import { useEffect, useState } from 'react';
import { DEFAULT_SCENE, CAMERA_PRESETS, WORLD_NODES, type SceneConfig } from '@/lib/world/config';
import { Icon } from '@/components/ui/Icon';
import { useToast } from '@/lib/toast';
import { SCENE_PREVIEW_EVENT, SCENE_PREVIEW_KEY } from '@/lib/world/useScenePreview';

/**
 * Structured scene editor (spec §43). No arbitrary code: typed fields only.
 * Edits are stored in this browser and applied live to the globe for the
 * fields listed under PREVIEW STATE; JSON export carries them into the CMS.
 * There is no /api/admin/scene persistence in this build.
 */

/** Buffers the raw text so "-" and partial decimals survive until valid. */
function CoordInput({ label, value, min, max, onCommit }: {
  label: string; value: number; min: number; max: number; onCommit: (v: number) => void;
}) {
  const [text, setText] = useState(String(value));
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (!editing) setText(String(value));
  }, [value, editing]);

  return (
    <label className="fld">
      <span>{label}</span>
      <input className="inp min-w-0" type="number" inputMode="decimal" min={min} max={max} step={0.001}
        value={text}
        onFocus={() => setEditing(true)}
        onChange={(e) => {
          setText(e.target.value);
          const v = e.target.valueAsNumber;
          if (Number.isFinite(v) && v >= min && v <= max) onCommit(v);
        }}
        onBlur={() => {
          setEditing(false);
          const v = Number(text);
          if (!Number.isFinite(v) || v < min || v > max) setText(String(value));
          else setText(String(v));
        }} />
    </label>
  );
}
export function SceneEditorClient() {
  const [cfg, setCfg] = useState<SceneConfig>(DEFAULT_SCENE);
  const toast = useToast();

  useEffect(() => {
    try {
      const raw = localStorage.getItem(SCENE_PREVIEW_KEY);
      if (raw) setCfg({ ...DEFAULT_SCENE, ...JSON.parse(raw) });
    } catch { /* ignore */ }
  }, []);

  const set = <K extends keyof SceneConfig>(k: K, v: SceneConfig[K]) => {
    const next = { ...cfg, [k]: v };
    setCfg(next);
    try { localStorage.setItem(SCENE_PREVIEW_KEY, JSON.stringify(next)); } catch { /* ignore */ }
    window.dispatchEvent(new Event(SCENE_PREVIEW_EVENT));
  };

  const setNode = (id: string, patch: Partial<SceneConfig['nodes'][string]>) => {
    const base = WORLD_NODES.find((n) => n.id === id);
    if (!base) return;
    const all = cfg.nodes ?? {};
    const cur = all[id] ?? { enabled: base.enabled, lat: base.position.lat, lon: base.position.lon };
    set('nodes', { ...all, [id]: { ...cur, ...patch } });
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
            <button className="btn btn-g btn-sm" onClick={() => { setCfg(DEFAULT_SCENE); localStorage.removeItem(SCENE_PREVIEW_KEY); window.dispatchEvent(new Event(SCENE_PREVIEW_EVENT)); toast('Reset to defaults.', 'info'); }}>
              <Icon name="refresh" size={14} />Reset
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-5">
        <div className="panel p-6">
          <div className="mono text-[9.7px] tracking-[.2em] dim mb-4">WORLD NODES</div>
          <div className="space-y-2">
            {WORLD_NODES.map((n) => {
              const o = (cfg.nodes ?? {})[n.id];
              const lat = o?.lat ?? n.position.lat;
              const lon = o?.lon ?? n.position.lon;
              const on = o?.enabled ?? n.enabled;
              return (
                <div key={n.id} className="rounded-xl border p-3.5" style={{ borderColor: 'var(--line)', background: 'var(--panel2)' }}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-display font-semibold text-[13px]">{n.title}</span>
                    <button className={`sw${on ? ' on' : ''}`} aria-label={`${n.title} visible`}
                      onClick={() => setNode(n.id, { enabled: !on })} />
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-2.5">
                    <CoordInput label="Latitude" value={lat} min={-90} max={90}
                      onCommit={(v) => setNode(n.id, { lat: v })} />
                    <CoordInput label="Longitude" value={lon} min={-180} max={180}
                      onCommit={(v) => setNode(n.id, { lon: v })} />
                  </div>
                  <div className="dim mono text-[9.6px] tracking-[.14em] mt-1.5">
                    {n.cameraPreset}{o ? ' · preview override' : ''}
                  </div>
                </div>
              );
            })}
          </div>
          <p className="dim text-[11.4px] mt-4 leading-relaxed">
            Move a node&apos;s latitude/longitude or switch it off — saved in this browser and applied live to the globe.
            Adding or deleting nodes is a CMS feature and is not available in this build.
          </p>
          <button className="btn btn-g btn-sm mt-3" disabled={!Object.keys(cfg.nodes ?? {}).length}
            onClick={() => set('nodes', {})}>
            <Icon name="refresh" size={14} />Reset nodes
          </button>
        </div>
        <div className="panel p-6">
          <div className="mono text-[9.7px] tracking-[.2em] dim mb-4">PREVIEW STATE</div>
          <p className="mut text-[12.6px] leading-relaxed">
            Saved in this browser only (localStorage) — no database or API persistence in this build.
            Export JSON to carry the values into the CMS.
          </p>
          <p className="dim text-[11.4px] mt-3 leading-relaxed">
            <strong className="text-[var(--txt)]">Applied live to the globe:</strong> field of view, auto-rotate and speed,
            vertical wobble, stars, dust, atmosphere, particle count (capped by the quality tier), drag, wheel zoom,
            pointer readout and node position/visibility. Open Home or Explore on this browser to see the change.
          </p>
          <p className="dim text-[11.4px] mt-3 leading-relaxed">
            <strong className="text-[var(--txt)]">Stored but not applied yet:</strong> enabled, scale, opacity, lighting
            and quality default.
          </p>
          <a href="/explore?mode=earth" className="btn btn-g btn-sm mt-4">
            <Icon name="globe" size={14} />Open the globe
          </a>
        </div>
      </div>
    </div>
  );
}
