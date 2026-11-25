'use client';

import { useEffect, useRef, useState } from 'react';
import { prefersReduced } from './Motion';

const VERT = `#version 300 es
precision highp float;
out vec2 vUv;
void main() {
  // One oversized triangle covering the viewport — cheaper than a quad.
  vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  vUv = p;
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`;

const FRAG = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 outColor;
uniform vec2 uRes;
uniform float uTime;
uniform vec2 uPointer;
uniform float uFade;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x),
             mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
}
float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 5; i++) {
    v += a * noise(p);
    p = p * 2.02 + vec2(1.3, -0.7);
    a *= 0.52;
  }
  return v;
}

void main() {
  vec2 uv = vUv;
  vec2 p = (uv * 2.0 - 1.0);
  p.x *= uRes.x / max(uRes.y, 1.0);

  float t = uTime * 0.035;
  vec2 drift = uPointer * 0.16;

  // Two slow, differently-scaled fields make the bands fold instead of scroll.
  float n = fbm(p * 1.9 + vec2(t * 0.6, -t * 0.35) + drift);
  float m = fbm(p * 3.4 - vec2(t * 0.45, t * 0.5) + n * 1.4);

  float band = smoothstep(0.28, 0.92, n) * (0.35 + 0.65 * m);
  float rim = pow(1.0 - abs(p.y * 0.7 + n * 0.55 - 0.25), 2.6);

  vec3 cyan = vec3(0.208, 0.878, 1.0);
  vec3 violet = vec3(0.486, 0.361, 1.0);
  vec3 pink = vec3(1.0, 0.306, 0.804);

  vec3 col = mix(violet, cyan, clamp(n * 1.5, 0.0, 1.0));
  col = mix(col, pink, smoothstep(0.55, 1.0, m) * 0.42);
  col *= band * 0.75 + rim * 0.32;

  // Keep the centre quiet so the headline and the globe stay readable.
  float quiet = smoothstep(0.05, 0.85, length(p * vec2(0.85, 1.0)));
  outColor = vec4(col * quiet * uFade, 1.0);
}`;

/**
 * AuroraGL — a raw WebGL backdrop for the hero, one draw call per frame.
 *
 * Deliberately not three.js: the globe already owns a full R3F scene, and a
 * second scene graph to paint a gradient would be wasted bytes. Reduced motion,
 * a hidden tab, or a lost context all stop the loop and leave a static CSS wash.
 */
export function AuroraGL({ className = '' }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  const [supported, setSupported] = useState(false);

  useEffect(() => {
    const probe = document.createElement('canvas');
    const gl = probe.getContext('webgl2');
    if (!gl) return;
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    setSupported(true);
  }, []);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || !supported || prefersReduced()) return;
    const gl = canvas.getContext('webgl2', { alpha: true, antialias: false, depth: false, powerPreference: 'low-power' });
    if (!gl) return;

    const compile = (type: number, src: string) => {
      const sh = gl.createShader(type);
      if (!sh) throw new Error('shader alloc failed');
      gl.shaderSource(sh, src);
      gl.compileShader(sh);
      if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
        const log = gl.getShaderInfoLog(sh);
        gl.deleteShader(sh);
        throw new Error(log || 'shader compile failed');
      }
      return sh;
    };

    let program: WebGLProgram | null = null;
    try {
      program = gl.createProgram();
      gl.attachShader(program, compile(gl.VERTEX_SHADER, VERT));
      gl.attachShader(program, compile(gl.FRAGMENT_SHADER, FRAG));
      gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program) || 'link failed');
    } catch {
      // A shader failure must never take the hero down — the CSS wash remains.
      return;
    }

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.useProgram(program);

    const uRes = gl.getUniformLocation(program, 'uRes');
    const uTime = gl.getUniformLocation(program, 'uTime');
    const uPointer = gl.getUniformLocation(program, 'uPointer');
    const uFade = gl.getUniformLocation(program, 'uFade');

    const pointer = { x: 0, y: 0 };
    const target = { x: 0, y: 0 };
    const onMove = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      target.x = ((e.clientX - r.left) / r.width) * 2 - 1;
      target.y = ((e.clientY - r.top) / r.height) * 2 - 1;
    };
    window.addEventListener('pointermove', onMove, { passive: true });

    let raf = 0;
    let visible = true;
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      const w = Math.round(canvas.clientWidth * dpr);
      const h = Math.round(canvas.clientHeight * dpr);
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
        gl.viewport(0, 0, w, h);
      }
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const t0 = performance.now();
    const frame = () => {
      raf = requestAnimationFrame(frame);
      if (!visible || gl.isContextLost()) return;
      pointer.x += (target.x - pointer.x) * 0.045;
      pointer.y += (target.y - pointer.y) * 0.045;
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform1f(uTime, (performance.now() - t0) / 1000);
      gl.uniform2f(uPointer, pointer.x, pointer.y);
      gl.uniform1f(uFade, 0.85);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };
    raf = requestAnimationFrame(frame);

    const onVisibility = () => {
      visible = document.visibilityState !== 'hidden';
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pointermove', onMove);
      gl.deleteProgram(program);
      gl.deleteBuffer(buf);
      const ext = gl.getExtension('WEBGL_lose_context');
      ext?.loseContext();
    };
  }, [supported]);

  if (!supported) return null;
  return <canvas ref={ref} className={`aurora-gl ${className}`} aria-hidden="true" />;
}
