'use client';

import { useFrame } from '@react-three/fiber';
import { useRef, type RefObject } from 'react';
import * as THREE from 'three';
import type { QualityTier } from './tier';

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const smooth = (a: number, b: number, v: number) => {
  const t = clamp01((v - a) / (b - a));
  return t * t * (3 - 2 * t);
};

function DoorLeaf({ side, pivot }: { side: -1 | 1; pivot: RefObject<THREE.Group | null> }) {
  return (
    <group ref={pivot} position={[side * 1.52, 0, 0]}>
      <mesh position={[-side * 0.76, 0, 0]}>
        <boxGeometry args={[1.5, 3.2, 0.16]} />
        <meshStandardMaterial
          color="#10251d"
          roughness={0.28}
          metalness={0.72}
          emissive="#1b6b4c"
          emissiveIntensity={0.18}
        />
      </mesh>
      <mesh position={[-side * 0.76, 0, 0.09]}>
        <planeGeometry args={[1.18, 2.72]} />
        <meshStandardMaterial
          color="#173a2d"
          roughness={0.42}
          metalness={0.45}
          emissive="#245f47"
          emissiveIntensity={0.16}
        />
      </mesh>
      <mesh position={[-side * 1.28, 0, 0.18]}>
        <boxGeometry args={[0.05, 0.42, 0.08]} />
        <meshStandardMaterial color="#d8c18a" metalness={0.9} roughness={0.18} emissive="#9f8147" emissiveIntensity={0.25} />
      </mesh>
    </group>
  );
}

function Emblem() {
  return (
    <group position={[0, 4.05, 0.16]}>
      <mesh>
        <torusGeometry args={[0.34, 0.025, 8, 40]} />
        <meshBasicMaterial color="#b8f1d5" toneMapped={false} />
      </mesh>
      <mesh position={[-0.12, 0, 0.02]} rotation={[0, 0, -0.42]}>
        <boxGeometry args={[0.045, 0.42, 0.04]} />
        <meshBasicMaterial color="#b8f1d5" toneMapped={false} />
      </mesh>
      <mesh position={[0.12, 0, 0.02]} rotation={[0, 0, 0.42]}>
        <boxGeometry args={[0.045, 0.42, 0.04]} />
        <meshBasicMaterial color="#b8f1d5" toneMapped={false} />
      </mesh>
      <mesh position={[0, -0.08, 0.03]}>
        <boxGeometry args={[0.22, 0.035, 0.04]} />
        <meshBasicMaterial color="#b8f1d5" toneMapped={false} />
      </mesh>
    </group>
  );
}

function PortalFrame({ color = '#45d49a' }: { color?: string }) {
  return (
    <group>
      <mesh position={[-1.72, 0, 0]}>
        <boxGeometry args={[0.28, 4.25, 0.5]} />
        <meshStandardMaterial color="#14251f" metalness={0.75} roughness={0.3} />
      </mesh>
      <mesh position={[1.72, 0, 0]}>
        <boxGeometry args={[0.28, 4.25, 0.5]} />
        <meshStandardMaterial color="#14251f" metalness={0.75} roughness={0.3} />
      </mesh>
      <mesh position={[0, 2.06, 0]}>
        <boxGeometry args={[3.72, 0.3, 0.5]} />
        <meshStandardMaterial color="#14251f" metalness={0.75} roughness={0.3} />
      </mesh>
      <mesh position={[-1.54, 0, 0.28]}>
        <boxGeometry args={[0.035, 3.8, 0.04]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>
      <mesh position={[1.54, 0, 0.28]}>
        <boxGeometry args={[0.035, 3.8, 0.04]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>
      <mesh position={[0, 1.9, 0.28]}>
        <boxGeometry args={[3.1, 0.035, 0.04]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>
    </group>
  );
}

function Atrium({ tier }: { tier: QualityTier }) {
  const columns = tier === 'low' || tier === 'mobile' ? 4 : 6;
  return (
    <group position={[0, 0, -6]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2.05, 0]}>
        <planeGeometry args={[18, 20]} />
        <meshStandardMaterial color="#07110e" metalness={0.72} roughness={0.24} emissive="#0a2a1d" emissiveIntensity={0.28} />
      </mesh>
      <gridHelper args={[20, 20, '#45d49a', '#173a2d']} position={[0, -2.035, 0]} />
      <mesh position={[0, 0.4, -6]}>
        <planeGeometry args={[18, 7]} />
        <meshBasicMaterial color="#08120f" />
      </mesh>
      <mesh position={[0, 2.6, -3]}>
        <torusGeometry args={[3.4, 0.055, 8, 64]} />
        <meshBasicMaterial color="#78e7b6" toneMapped={false} />
      </mesh>
      {Array.from({ length: columns }, (_, i) => {
        const x = (i - (columns - 1) / 2) * 3.1;
        return (
          <group key={i} position={[x, 0, -1.5]}>
            <mesh>
              <boxGeometry args={[0.34, 4.4, 0.34]} />
              <meshStandardMaterial color="#14251f" metalness={0.68} roughness={0.34} emissive="#123a2a" emissiveIntensity={0.35} />
            </mesh>
            <mesh position={[0, 0, 0.19]}>
              <boxGeometry args={[0.035, 3.8, 0.035]} />
              <meshBasicMaterial color="#45d49a" toneMapped={false} />
            </mesh>
          </group>
        );
      })}
      {['#35e0ff', '#7c5cff', '#3ddc97', '#ff4ecd', '#f5c26b'].map((color, i) => (
        <group key={color} position={[(i - 2) * 2.7, 0.1, -4.6]} scale={0.52}>
          <PortalFrame color={color} />
        </group>
      ))}
      <mesh position={[0, -1.25, -1.2]}>
        <cylinderGeometry args={[0.72, 0.9, 0.28, 40]} />
        <meshStandardMaterial color="#10251d" metalness={0.8} roughness={0.2} emissive="#1b6b4c" emissiveIntensity={0.25} />
      </mesh>
      <pointLight position={[0, 1.2, -1]} color="#b8f1d5" intensity={55} distance={18} decay={2} />
    </group>
  );
}

export function PortalArchitecture({
  journeyRef,
  tier,
  reduced,
}: {
  journeyRef?: RefObject<number>;
  tier: QualityTier;
  reduced: boolean;
}) {
  const portal = useRef<THREE.Group>(null);
  const left = useRef<THREE.Group>(null);
  const right = useRef<THREE.Group>(null);
  const atrium = useRef<THREE.Group>(null);
  const glow = useRef<THREE.PointLight>(null);

  useFrame(() => {
    const p = reduced ? 1 : clamp01(journeyRef?.current ?? 0);
    const reveal = smooth(0.24, 0.48, p);
    const open = reduced ? 1 : smooth(0.5, 0.7, p);
    const inside = smooth(0.72, 0.92, p);
    if (portal.current) {
      portal.current.visible = reveal > 0.001;
      portal.current.position.z = (1 - reveal) * 7;
      portal.current.scale.setScalar(0.82 + reveal * 0.18);
    }
    if (left.current) left.current.rotation.y = -open * 1.46;
    if (right.current) right.current.rotation.y = open * 1.46;
    if (glow.current) glow.current.intensity = 2 + open * 24;
    if (atrium.current) {
      atrium.current.visible = inside > 0.001;
      atrium.current.scale.setScalar(0.92 + inside * 0.08);
    }
  });

  return (
    <group>
      <ambientLight intensity={1.15} color="#b8f1d5" />
      <directionalLight position={[3, 6, 5]} intensity={3.2} color="#e9fff5" />
      <group ref={portal}>
        <PortalFrame />
        <Emblem />
        <DoorLeaf side={-1} pivot={left} />
        <DoorLeaf side={1} pivot={right} />
        <mesh position={[0, 0, -0.12]}>
          <planeGeometry args={[3.05, 3.7]} />
          <meshBasicMaterial color="#0a1712" />
        </mesh>
        <pointLight ref={glow} position={[0, 0.4, 0.8]} color="#b8f1d5" intensity={2} distance={10} decay={2} />
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.72, 1.5]}>
          <planeGeometry args={[7, 7]} />
          <meshStandardMaterial color="#09130f" metalness={0.85} roughness={0.2} />
        </mesh>
      </group>
      <group ref={atrium}>
        <Atrium tier={tier} />
      </group>
    </group>
  );
}
