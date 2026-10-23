/* ==========================================================================
   ADELIA’S ROOM — 3D design kit (the gacha machine is the only 3D object).
   One material library + a handful of primitives in the room's clear-tech
   family: pink and pearl plastics, clear acrylic, polished chrome, graphite
   screens, with pink and baby blue as small signals. Build from these —
   never invent new colours ad hoc. Canvas/troika type: M PLUS Rounded 1c,
   JetBrains Mono and Doto (no Space Grotesk).
   ========================================================================== */
import { RoundedBox, Text } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { forwardRef, useEffect, useMemo, useRef, type ReactNode } from 'react';
import * as THREE from 'three';
import monoUrl from '@fontsource/jetbrains-mono/files/jetbrains-mono-latin-500-normal.woff?url';
import monoBoldUrl from '@fontsource/jetbrains-mono/files/jetbrains-mono-latin-700-normal.woff?url';
import dotUrl from '@fontsource/doto/files/doto-latin-800-normal.woff?url';
import displayUrl from '@fontsource/m-plus-rounded-1c/files/m-plus-rounded-1c-latin-800-normal.woff?url';

export const FONTS = { mono: monoUrl, monoBold: monoBoldUrl, dot: dotUrl, display: displayUrl };

/* --------------------------------------------------------------------------
   Palette (sRGB hex) — mirrors the CSS tokens in styles/global.css.
   The dside names (alu*, orange…) are kept as aliases so older call sites
   still compile; they point at the room's colours now.
   -------------------------------------------------------------------------- */
export const COLORS = {
  // neutral white scale (--ice-*)
  ice0: '#ffffff',
  ice1: '#f7f8fa',
  ice2: '#eff1f4',
  ice3: '#e3e6eb',
  ice4: '#c5cad2',
  ice5: '#8c939e',
  // ink + screens
  ink: '#161b26',
  ink2: '#3b4250',
  ink3: '#5c6472',
  screen: '#10141c',
  graphite: '#2b3241',
  // the gacha machine's plastics
  pink: '#ff7eb6', // --accent (signal: LEDs, hearts)
  pinkSoft: '#ffd6e8',
  pinkBody: '#f6b2cf', // the machine's moulded body
  pinkDeep: '#e98ab4', // its skirt and cap rim
  pinkInk: '#bc2570', // pink text on light
  pearl: '#f7f8fa',
  // blue signal
  baby: '#a9d6f5',
  blue: '#5aa9e6',
  blueInk: '#1f5f96',
  lilac: '#cdb9f2',
  mint: '#bfeedd',
  // status
  green: '#2fbf8a',
  red: '#e5484d',
  yellow: '#f5c84b',
  lime: '#c8f560',
  // deprecated dside aliases
  alu0: '#ffffff',
  alu1: '#eff1f4',
  alu2: '#e3e6eb',
  alu3: '#c5cad2',
  alu4: '#8c939e',
  black: '#10141c',
  orange: '#ff7eb6',
  orangeDeep: '#e98ab4',
} as const;

export type MatName =
  | 'pearl'
  | 'pinkPlastic'
  | 'pinkDeep'
  | 'pinkGloss'
  | 'acrylic'
  | 'acrylicTint'
  | 'chrome'
  | 'satin'
  | 'ink'
  | 'screenOff'
  | 'rubber'
  | 'white'
  | 'baby'
  // deprecated dside names (re-pointed)
  | 'alu'
  | 'aluLight'
  | 'aluDark'
  | 'aluBrushed'
  | 'graphite'
  | 'black'
  | 'blackGloss'
  | 'orange'
  | 'orangeGloss'
  | 'blue'
  | 'glass'
  | 'paper';

const cache = new Map<string, THREE.Material>();

function make(name: MatName): THREE.Material {
  const std = (p: THREE.MeshStandardMaterialParameters) => new THREE.MeshStandardMaterial(p);
  const phys = (p: THREE.MeshPhysicalMaterialParameters) => new THREE.MeshPhysicalMaterial(p);
  switch (name) {
    case 'pearl':
    case 'aluLight':
      return phys({ color: COLORS.pearl, roughness: 0.34, metalness: 0, clearcoat: 0.55, clearcoatRoughness: 0.3, sheen: 0.4, sheenColor: new THREE.Color('#f3e9ff'), sheenRoughness: 0.5 });
    case 'pinkPlastic':
    case 'orange':
      return phys({ color: COLORS.pinkBody, roughness: 0.36, metalness: 0, clearcoat: 0.7, clearcoatRoughness: 0.22 });
    case 'pinkDeep':
      return phys({ color: COLORS.pinkDeep, roughness: 0.4, metalness: 0, clearcoat: 0.5, clearcoatRoughness: 0.3 });
    case 'pinkGloss':
    case 'orangeGloss':
      return phys({ color: COLORS.pink, roughness: 0.22, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.12 });
    case 'acrylic':
    case 'glass':
      return phys({
        color: '#ffffff',
        roughness: 0.03,
        metalness: 0,
        clearcoat: 1,
        clearcoatRoughness: 0.03,
        transparent: true,
        opacity: 0.12,
        envMapIntensity: 2.2,
        depthWrite: false,
        side: THREE.DoubleSide,
      });
    case 'acrylicTint':
      return phys({ color: COLORS.pinkSoft, roughness: 0.08, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.06, transparent: true, opacity: 0.55, depthWrite: false });
    case 'chrome':
      return std({ color: '#e7e9ee', roughness: 0.1, metalness: 1 });
    case 'satin':
    case 'alu':
    case 'aluBrushed':
      return std({ color: COLORS.ice2, roughness: 0.32, metalness: 0.85 });
    case 'aluDark':
      return std({ color: COLORS.ice4, roughness: 0.4, metalness: 0.8 });
    case 'ink':
    case 'graphite':
      return std({ color: COLORS.graphite, roughness: 0.55, metalness: 0.15 });
    case 'black':
      return std({ color: COLORS.screen, roughness: 0.5, metalness: 0.05 });
    case 'screenOff':
    case 'blackGloss':
      return phys({ color: '#0b0e14', roughness: 0.14, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.06 });
    case 'rubber':
      return std({ color: '#c9cdd4', roughness: 0.9, metalness: 0 });
    case 'white':
    case 'paper':
      return std({ color: '#fbfbfc', roughness: 0.62, metalness: 0 });
    case 'baby':
    case 'blue':
      return phys({ color: COLORS.baby, roughness: 0.3, metalness: 0, clearcoat: 0.7, clearcoatRoughness: 0.2 });
  }
}

/** Shared material instance by name (do not mutate). */
export function mat(name: MatName): THREE.Material {
  let m = cache.get(name);
  if (!m) {
    m = make(name);
    cache.set(name, m);
  }
  return m;
}

/* --------------------------------------------------------------------------
   Primitives
   -------------------------------------------------------------------------- */
type V3 = [number, number, number];

export interface RBoxProps {
  size: V3;
  radius?: number;
  smoothness?: number;
  material?: MatName | THREE.Material;
  position?: V3;
  rotation?: V3;
  castShadow?: boolean;
  receiveShadow?: boolean;
  children?: ReactNode;
  onClick?: (e: unknown) => void;
}

/** Rounded box — the atom of every device. */
export const RBox = forwardRef<THREE.Mesh, RBoxProps>(function RBox(
  { size, radius = 0.01, smoothness = 4, material = 'pearl', castShadow = true, receiveShadow = true, children, ...rest },
  ref,
) {
  const r = Math.min(radius, Math.min(...size) / 2 - 0.0005);
  return (
    <RoundedBox
      ref={ref}
      args={size}
      radius={Math.max(r, 0.0005)}
      smoothness={smoothness}
      material={typeof material === 'string' ? mat(material) : material}
      castShadow={castShadow}
      receiveShadow={receiveShadow}
      {...rest}
    >
      {children}
    </RoundedBox>
  );
});

/** Cylinder helper (knobs, buttons, feet). Axis = Y. */
export function Cyl({
  r = 0.02,
  h = 0.01,
  seg = 32,
  material = 'pearl',
  position,
  rotation,
  castShadow = true,
}: {
  r?: number;
  h?: number;
  seg?: number;
  material?: MatName | THREE.Material;
  position?: V3;
  rotation?: V3;
  castShadow?: boolean;
}) {
  return (
    <mesh position={position} rotation={rotation} castShadow={castShadow} receiveShadow material={typeof material === 'string' ? mat(material) : material}>
      <cylinderGeometry args={[r, r, h, seg]} />
    </mesh>
  );
}

/** Knurled knob with an indicator line. Axis = Y (rotate the parent to mount on faces). */
export function Knob({ r = 0.018, h = 0.016, material = 'pearl', indicator = 'pinkGloss', value = 0.5, position, rotation }: {
  r?: number;
  h?: number;
  material?: MatName;
  indicator?: MatName;
  /** 0..1 maps to −135°..+135° */
  value?: number;
  position?: V3;
  rotation?: V3;
}) {
  const a = (-135 + value * 270) * (Math.PI / 180);
  return (
    <group position={position} rotation={rotation}>
      <Cyl r={r} h={h} seg={40} material={material} position={[0, h / 2, 0]} />
      <Cyl r={r * 0.82} h={0.002} seg={40} material="satin" position={[0, h + 0.001, 0]} castShadow={false} />
      <group rotation={[0, -a, 0]}>
        <mesh position={[0, h + 0.0025, -r * 0.5]} material={mat(indicator)}>
          <boxGeometry args={[r * 0.12, 0.001, r * 0.7]} />
        </mesh>
      </group>
    </group>
  );
}

/** Small cross-head screw. Faces +Z by default. */
export function Screw({ position, rotation, r = 0.0045 }: { position?: V3; rotation?: V3; r?: number }) {
  return (
    <group position={position} rotation={rotation}>
      <mesh rotation={[Math.PI / 2, 0, 0]} material={mat('chrome')}>
        <cylinderGeometry args={[r, r, 0.002, 16]} />
      </mesh>
      <mesh position={[0, 0, 0.0011]} material={mat('ink')}>
        <boxGeometry args={[r * 1.3, r * 0.22, 0.0004]} />
      </mesh>
      <mesh position={[0, 0, 0.0011]} rotation={[0, 0, Math.PI / 2]} material={mat('ink')}>
        <boxGeometry args={[r * 1.3, r * 0.22, 0.0004]} />
      </mesh>
    </group>
  );
}

/** Status LED. Faces +Z by default. `blink` in Hz. */
export function Led({ color = COLORS.pink, on = true, r = 0.003, blink = 0, position, rotation }: {
  color?: string;
  on?: boolean;
  r?: number;
  blink?: number;
  position?: V3;
  rotation?: V3;
}) {
  const m = useMemo(() => new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: on ? 3 : 0, roughness: 0.3 }), [color]);
  useEffect(() => () => m.dispose(), [m]);
  useFrame(({ clock }) => {
    const lit = on && (!blink || Math.sin(clock.elapsedTime * Math.PI * 2 * blink) > 0);
    m.emissiveIntensity = lit ? 3 : 0;
    m.color.set(lit ? color : '#c5cad2');
  });
  return (
    <mesh position={position} rotation={rotation} material={m}>
      <sphereGeometry args={[r, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
    </mesh>
  );
}

/** Engraved/printed label (troika text). Faces +Z by default. */
export function Label({
  children,
  size = 0.008,
  color = COLORS.ink,
  font = 'mono',
  anchorX = 'center',
  anchorY = 'middle',
  letterSpacing = 0.08,
  position,
  rotation,
  maxWidth,
  textAlign,
}: {
  children: ReactNode;
  size?: number;
  color?: string;
  font?: keyof typeof FONTS;
  anchorX?: 'left' | 'center' | 'right';
  anchorY?: 'top' | 'middle' | 'bottom';
  letterSpacing?: number;
  position?: V3;
  rotation?: V3;
  maxWidth?: number;
  textAlign?: 'left' | 'center' | 'right';
}) {
  return (
    <Text
      font={FONTS[font]}
      fontSize={size}
      color={color}
      anchorX={anchorX}
      anchorY={anchorY}
      letterSpacing={letterSpacing}
      position={position}
      rotation={rotation}
      maxWidth={maxWidth}
      textAlign={textAlign}
    >
      {children}
    </Text>
  );
}

/* --------------------------------------------------------------------------
   Canvas-driven textures (screens, LCDs, posters, paper)
   -------------------------------------------------------------------------- */

/**
 * A CanvasTexture you draw into with 2D canvas. `draw` runs once, then every
 * `fps` frames per second if fps > 0 (use for clocks / screens).
 */
export function useCanvasTexture(
  width: number,
  height: number,
  draw: (ctx: CanvasRenderingContext2D, w: number, h: number, t: number) => void,
  fps = 0,
  deps: unknown[] = [],
) {
  const canvas = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = width;
    c.height = height;
    return c;
  }, [width, height]);
  const tex = useMemo(() => {
    const t = new THREE.CanvasTexture(canvas);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    return t;
  }, [canvas]);
  const drawRef = useRef(draw);
  drawRef.current = draw;
  const last = useRef(-1);

  useEffect(() => {
    const ctx = canvas.getContext('2d')!;
    drawRef.current(ctx, width, height, performance.now() / 1000);
    tex.needsUpdate = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canvas, tex, width, height, ...deps]);

  useFrame(({ clock }) => {
    if (!fps) return;
    const t = clock.elapsedTime;
    if (t - last.current < 1 / fps) return;
    last.current = t;
    const ctx = canvas.getContext('2d')!;
    drawRef.current(ctx, width, height, t);
    tex.needsUpdate = true;
  });

  useEffect(() => () => tex.dispose(), [tex]);
  return tex;
}

/** Emissive screen material from a texture (for monitors, LCDs). */
export function useScreenMaterial(map: THREE.Texture, intensity = 1.2) {
  const m = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        map,
        emissiveMap: map,
        emissive: new THREE.Color('#ffffff'),
        emissiveIntensity: intensity,
        roughness: 0.25,
        metalness: 0,
        toneMapped: true,
      }),
    [map],
  );
  useEffect(() => {
    m.emissiveIntensity = intensity;
  }, [m, intensity]);
  useEffect(() => () => m.dispose(), [m]);
  return m;
}

/** Shared procedural noise texture for floors/walls (grayscale). */
const noiseCache = new Map<string, THREE.CanvasTexture>();
export function grainTexture(base: string, amount = 10, size = 512, blotches = 0): THREE.CanvasTexture {
  const key = `${base}-${amount}-${size}-${blotches}`;
  const hit = noiseCache.get(key);
  if (hit) return hit;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d')!;
  g.fillStyle = base;
  g.fillRect(0, 0, size, size);
  for (let i = 0; i < blotches; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const r = 20 + Math.random() * 90;
    const grd = g.createRadialGradient(x, y, 0, x, y, r);
    const a = Math.random() * 0.06;
    grd.addColorStop(0, `rgba(${Math.random() > 0.5 ? '0,0,0' : '255,255,255'},${a})`);
    grd.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grd;
    g.fillRect(x - r, y - r, r * 2, r * 2);
  }
  const img = g.getImageData(0, 0, size, size);
  for (let i = 0; i < img.data.length; i += 4) {
    const n = (Math.random() - 0.5) * amount;
    img.data[i] += n;
    img.data[i + 1] += n;
    img.data[i + 2] += n;
  }
  g.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  noiseCache.set(key, t);
  return t;
}
