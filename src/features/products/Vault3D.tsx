/* ==========================================================================
   The gacha machine — the room's only 3D object (R3F, lazy-loaded).
   Her pink-and-clear capsule machine on a turntable: a pink moulded body,
   a clear acrylic dome full of pastel capsules, a chrome crank and a
   capsule chute. Turn the crank → a capsule drops out of the chute, rolls
   to the front and opens → the five Tenderlens modules unfold out of it
   (M1 crawl, M2 triage, M3 extract-and-check, M4 verdict rules, EV eval
   cartridge). Module ids (story/game/convert/insight/launch) are dside's
   part ids, shared with vaultData.ts. Everything is built from @/three/kit.
   Light comes from the window on the right, so shadows fall to the left.
   ========================================================================== */
import { Suspense, useEffect, useLayoutEffect, useMemo, useRef, type MutableRefObject } from 'react';
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { CameraControls, CameraControlsImpl, ContactShadows, Environment, Lightformer } from '@react-three/drei';
import * as THREE from 'three';
import { COLORS, Cyl, Knob, Label, Led, RBox, mat, useCanvasTexture, useScreenMaterial } from '@/three/kit';
import { sfx } from '@/audio/engine';
import { useVault, type ModuleId, type VaultStatus } from './vaultData';

/* ------------------------------------------------------------------ dimensions (m) */
const W = 0.23; // body width
const D = 0.2; // body depth
const SKIRT_H = 0.014;
const BASE_H = 0.156;
const BASE_Y1 = SKIRT_H + BASE_H; // top of the base = floor of the dome
const DOME_W = 0.214;
const DOME_D = 0.184;
const DOME_H = 0.172;
const DOME_Y = BASE_Y1 + DOME_H / 2;
const CAP_H = 0.04;
const CAP_Y = BASE_Y1 + DOME_H + CAP_H / 2;
const TOP = BASE_Y1 + DOME_H + CAP_H; // ≈ 0.38
const FRONT = D / 2;
const CRANK: [number, number] = [-0.042, 0.102];
const CHUTE: [number, number] = [0.056, 0.06];
const CAPSULE_R = 0.032;
/** where the dropped capsule comes to rest (on the turntable, in front of the machine) */
const REST: V3 = [0.012, CAPSULE_R, 0.25];
const TAU = Math.PI * 2;

type V3 = [number, number, number];
type Layout = 'wide' | 'compact';
interface Anim {
  /** crank turn 0..1 (one full turn) */
  key: number;
  /** capsule: drop out of the chute → roll to the front → open, 0..1 */
  door: number;
  /** modules unfolding out of the capsule 0..1 */
  explode: number;
  intro: number;
}

const POSES: Record<Layout, Record<ModuleId, { p: V3; r: V3 }>> = {
  wide: {
    story: { p: [-0.33, 0.3, 0.17], r: [-0.07, 0.42, 0] },
    game: { p: [-0.115, 0.4, 0.25], r: [-0.1, 0.15, 0] },
    convert: { p: [0.115, 0.4, 0.25], r: [-0.1, -0.15, 0] },
    insight: { p: [0.33, 0.3, 0.17], r: [-0.07, -0.42, 0] },
    launch: { p: [0, 0.17, 0.4], r: [-0.18, 0, 0] },
  },
  compact: {
    story: { p: [-0.066, 0.55, 0.14], r: [-0.1, 0.1, 0] },
    game: { p: [0.066, 0.55, 0.14], r: [-0.1, -0.1, 0] },
    convert: { p: [-0.066, 0.42, 0.19], r: [-0.08, 0.1, 0] },
    insight: { p: [0.066, 0.42, 0.19], r: [-0.08, -0.1, 0] },
    launch: { p: [0, 0.16, 0.38], r: [-0.16, 0, 0] },
  },
};
const ORDER: ModuleId[] = ['story', 'game', 'convert', 'insight', 'launch'];
const MOD_SIZE: V3 = [0.11, 0.105, 0.05];
const LAUNCH_SIZE: V3 = [0.2, 0.032, 0.05];

/* ------------------------------------------------------------------ easing */
const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);
const inOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const outCubic = (t: number) => 1 - Math.pow(1 - t, 3);
const inQuad = (t: number) => t * t;
const backOut = (t: number, s = 1.4) => 1 + (s + 1) * Math.pow(t - 1, 3) + s * Math.pow(t - 1, 2);
const approach = (v: number, target: number, step: number) => (v < target ? Math.min(target, v + step) : Math.max(target, v - step));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const noRay = () => {};
const reducedMotion = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ------------------------------------------------------------------ shared textures */
let haloTex: THREE.CanvasTexture | null = null;
function halo() {
  if (haloTex) return haloTex;
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d')!;
  const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grd.addColorStop(0, 'rgba(255,255,255,0.85)');
  grd.addColorStop(0.3, 'rgba(255,255,255,0.4)');
  grd.addColorStop(0.65, 'rgba(255,255,255,0.08)');
  grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 128, 128);
  haloTex = new THREE.CanvasTexture(c);
  haloTex.colorSpace = THREE.SRGBColorSpace;
  return haloTex;
}

/* ------------------------------------------------------------------ canvas helpers */
const mono = (w: number, px: number) => `${w} ${px}px "JetBrains Mono", ui-monospace, monospace`;
const dot = (px: number) => `800 ${px}px Doto, "JetBrains Mono", monospace`;
const INK = COLORS.ink;
const INK3 = COLORS.ink3;
const PINK_INK = COLORS.pinkInk;
function txt(ctx: CanvasRenderingContext2D, s: string, x: number, y: number, font: string, color: string, align: CanvasTextAlign = 'left', spacing = 1) {
  ctx.font = font;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  try {
    ctx.letterSpacing = `${spacing}px`;
  } catch {
    /* older engines */
  }
  ctx.fillText(s, x, y);
}

/** A printed (transparent) graphic on a face. */
function Decal({ w, h, px = 256, draw, position, rotation }: { w: number; h: number; px?: number; draw: (ctx: CanvasRenderingContext2D, cw: number, ch: number) => void; position: V3; rotation?: V3 }) {
  const ph = Math.round((px * h) / w);
  const tex = useCanvasTexture(px, ph, (ctx, cw, ch) => {
    ctx.clearRect(0, 0, cw, ch);
    draw(ctx, cw, ch);
  });
  const m = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        map: tex,
        transparent: true,
        roughness: 0.55,
        metalness: 0,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -2,
      }),
    [tex],
  );
  useEffect(() => () => m.dispose(), [m]);
  return (
    <mesh position={position} rotation={rotation} material={m} raycast={noRay}>
      <planeGeometry args={[w, h]} />
    </mesh>
  );
}

function useEmissive(color: string, intensity = 1) {
  const m = useMemo(() => new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: intensity, roughness: 0.35, toneMapped: false }), [color]);
  useEffect(() => () => m.dispose(), [m]);
  return m;
}

/* ==================================================================== scene */
export default function Vault3D({ quality, onError }: { quality: 'high' | 'low'; onError?: () => void }) {
  const anim = useRef<Anim>({ key: 0, door: 0, explode: 0, intro: 0 });
  const layout = useRef<Layout>('wide');
  const low = quality === 'low';
  return (
    <Canvas
      className="vt-canvas"
      dpr={low ? 1 : [1, 1.75]}
      camera={{ fov: 30, near: 0.02, far: 30, position: [1.9, 1.1, 2.4] }}
      gl={{ antialias: !low, alpha: true, powerPreference: low ? 'low-power' : 'high-performance' }}
      onCreated={(state) => {
        const { gl } = state;
        gl.toneMapping = THREE.NeutralToneMapping;
        gl.toneMappingExposure = 1.0;
        gl.setClearColor(0x000000, 0);
        // QA hooks (dev only): renderer stats + frameloop control for screenshots
        if (import.meta.env.DEV || /[?&]qa\b/.test(location.search)) Object.assign(window, { __vaultGL: gl, __vaultR3F: state });
        gl.domElement.addEventListener('webglcontextlost', (e) => {
          e.preventDefault();
          onError?.();
        });
      }}
    >
      <Suspense fallback={null}>
        <Lights low={low} />
        <LayoutSensor layout={layout} />
        <Plinth />
        <Machine anim={anim} layout={layout} low={low} />
        {low ? <BlobShadow /> : <ContactShadows position={[0, 0.0012, 0]} scale={0.95} resolution={512} blur={2.6} far={0.7} opacity={0.42} color={COLORS.ink} />}
        <Rig anim={anim} layout={layout} />
        <Ready />
      </Suspense>
    </Canvas>
  );
}

function Ready() {
  const n = useRef(0);
  useFrame(() => {
    n.current++;
    if (n.current >= 3 && !useVault.getState().ready) useVault.getState().setReady(true);
  });
  return null;
}

function LayoutSensor({ layout }: { layout: MutableRefObject<Layout> }) {
  const size = useThree((s) => s.size);
  layout.current = size.width / Math.max(1, size.height) < 0.95 ? 'compact' : 'wide';
  return null;
}

/* ------------------------------------------------------------------ light: a bright studio, window on the right */
function Lights({ low }: { low: boolean }) {
  return (
    <>
      <ambientLight intensity={0.45} />
      <directionalLight position={[2.2, 2.6, 1.4]} intensity={1.5} color="#ffffff" />
      <directionalLight position={[-2, 1.2, 1.2]} intensity={0.35} color="#eef4ff" />
      <Environment resolution={low ? 64 : 256} frames={1}>
        <color attach="background" args={['#e7eaef']} />
        {/* the window: a big soft box on the right */}
        <Lightformer form="rect" intensity={3.4} color="#ffffff" position={[4, 1.6, 0.8]} scale={[2.6, 4, 1]} />
        {/* overhead strip */}
        <Lightformer form="rect" intensity={2} position={[0, 4, 0.6]} scale={[5, 1.6, 1]} />
        {/* cool fill card on the left */}
        <Lightformer form="rect" intensity={0.9} color="#eaf3ff" position={[-4, 1, 2]} scale={[2.4, 2.4, 1]} />
        {/* rim strip behind */}
        <Lightformer form="rect" intensity={1.4} position={[0.6, 1.4, -4]} scale={[7, 0.5, 1]} />
        {/* soft front card (behind the camera) so faces never mirror dark */}
        <Lightformer form="rect" intensity={1.3} position={[0.6, 1.4, 5]} scale={[6, 3.2, 1]} />
        {/* catch lights in the chrome and the dome */}
        <Lightformer form="ring" intensity={1.6} color="#fff0f6" position={[2.4, 2.2, 3.6]} scale={1.2} />
      </Environment>
    </>
  );
}

function BlobShadow() {
  const tex = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const g = c.getContext('2d')!;
    const grd = g.createRadialGradient(64, 64, 8, 64, 64, 64);
    grd.addColorStop(0, 'rgba(22,27,38,0.42)');
    grd.addColorStop(0.55, 'rgba(22,27,38,0.18)');
    grd.addColorStop(1, 'rgba(22,27,38,0)');
    g.fillStyle = grd;
    g.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(c);
  }, []);
  useEffect(() => () => tex.dispose(), [tex]);
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-0.03, 0.0012, 0.01]} raycast={noRay}>
      <planeGeometry args={[0.5, 0.46]} />
      <meshBasicMaterial map={tex} transparent depthWrite={false} />
    </mesh>
  );
}

/* ------------------------------------------------------------------ turntable: a pearl disc with a chrome rim */
function Plinth() {
  return (
    <group>
      <mesh position={[0, -0.014, 0]} material={[mat('chrome'), mat('pearl'), mat('pearl')]} raycast={noRay}>
        <cylinderGeometry args={[0.44, 0.436, 0.028, 96]} />
      </mesh>
      <Decal
        w={0.88}
        h={0.88}
        px={1024}
        position={[0, 0.0004, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        draw={(ctx, w) => {
          const c = w / 2;
          ctx.save();
          ctx.translate(c, c);
          for (let i = 0; i < 120; i++) {
            const a = (i / 120) * TAU;
            const major = i % 10 === 0;
            ctx.strokeStyle = major ? 'rgba(22,27,38,0.42)' : 'rgba(22,27,38,0.16)';
            ctx.lineWidth = major ? 2.6 : 1.4;
            const r1 = c * 0.94;
            const r0 = major ? c * 0.875 : c * 0.905;
            ctx.beginPath();
            ctx.moveTo(Math.sin(a) * r0, -Math.cos(a) * r0);
            ctx.lineTo(Math.sin(a) * r1, -Math.cos(a) * r1);
            ctx.stroke();
          }
          ctx.strokeStyle = 'rgba(22,27,38,0.12)';
          ctx.lineWidth = 1.4;
          ctx.beginPath();
          ctx.arc(0, 0, c * 0.83, 0, TAU);
          ctx.stroke();
          ctx.fillStyle = COLORS.pink;
          ctx.beginPath();
          ctx.arc(0, -c * 0.962, 7, 0, TAU);
          ctx.fill();
          ctx.restore();
          txt(ctx, 'TENDERLENS · TL-v7 · TURN 360°', c, w * 0.885, mono(700, 18), 'rgba(22,27,38,0.42)', 'center', 6);
        }}
      />
    </group>
  );
}

/* ------------------------------------------------------------------ capsules piled inside the dome (instanced) */
const CAPSULE_COLORS = [COLORS.pink, COLORS.baby, COLORS.lilac, COLORS.mint, '#ffc2dc', '#cfe7fb'];
function pile(n: number) {
  const r = 0.024;
  const out: { p: V3; e: V3; c: string }[] = [];
  let s = 7;
  const rnd = () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
  const layer = (xs: number[], zs: number[], y: number) => {
    for (const x of xs)
      for (const z of zs) {
        if (out.length >= n) return;
        out.push({
          p: [x + (rnd() - 0.5) * 0.008, y + (rnd() - 0.5) * 0.004, z + (rnd() - 0.5) * 0.008],
          e: [(rnd() - 0.5) * 1.6, rnd() * TAU, (rnd() - 0.5) * 1.6],
          c: CAPSULE_COLORS[out.length % CAPSULE_COLORS.length],
        });
      }
  };
  layer([-0.074, -0.025, 0.025, 0.074], [-0.056, 0, 0.056], BASE_Y1 + r + 0.002);
  layer([-0.05, 0, 0.05], [-0.03, 0.03], BASE_Y1 + r * 2.6);
  layer([-0.026, 0.026], [0], BASE_Y1 + r * 4.1);
  return out;
}

function CapsulePile({ n }: { n: number }) {
  const tops = useRef<THREE.InstancedMesh>(null);
  const bots = useRef<THREE.InstancedMesh>(null);
  const data = useMemo(() => pile(n), [n]);
  const geo = useMemo(
    () => ({
      top: new THREE.SphereGeometry(0.024, 18, 9, 0, TAU, 0, Math.PI / 2),
      bot: new THREE.SphereGeometry(0.024, 18, 9, 0, TAU, Math.PI / 2, Math.PI / 2),
    }),
    [],
  );
  const topMat = useMemo(() => new THREE.MeshPhysicalMaterial({ color: '#ffffff', roughness: 0.25, clearcoat: 0.8, clearcoatRoughness: 0.15 }), []);
  useEffect(
    () => () => {
      geo.top.dispose();
      geo.bot.dispose();
      topMat.dispose();
    },
    [geo, topMat],
  );
  useLayoutEffect(() => {
    const t = tops.current;
    const b = bots.current;
    if (!t || !b) return;
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    const one = new THREE.Vector3(1, 1, 1);
    const p = new THREE.Vector3();
    const col = new THREE.Color();
    data.forEach((d, i) => {
      e.set(d.e[0], d.e[1], d.e[2]);
      q.setFromEuler(e);
      p.set(d.p[0], d.p[1], d.p[2]);
      m.compose(p, q, one);
      t.setMatrixAt(i, m);
      b.setMatrixAt(i, m);
      t.setColorAt(i, col.set(d.c));
    });
    t.instanceMatrix.needsUpdate = true;
    b.instanceMatrix.needsUpdate = true;
    if (t.instanceColor) t.instanceColor.needsUpdate = true;
  }, [data]);
  return (
    <group>
      <instancedMesh ref={tops} args={[geo.top, topMat, data.length]} raycast={noRay} />
      <instancedMesh ref={bots} args={[geo.bot, mat('pearl'), data.length]} raycast={noRay} />
    </group>
  );
}

/* ------------------------------------------------------------------ the machine */
function Machine({ anim, layout, low }: { anim: MutableRefObject<Anim>; layout: MutableRefObject<Layout>; low: boolean }) {
  const root = useRef<THREE.Group>(null);
  const crank = useRef<THREE.Group>(null);
  const flap = useRef<THREE.Group>(null);
  const pileRef = useRef<THREE.Group>(null);
  const landed = useRef(false);
  const prev = useRef<Anim>({ key: 0, door: 0, explode: 0, intro: 0 });
  const tickAt = useRef(0);
  const knobMat = useMemo(
    () => new THREE.MeshPhysicalMaterial({ color: COLORS.pink, roughness: 0.24, clearcoat: 1, clearcoatRoughness: 0.12, emissive: COLORS.pink, emissiveIntensity: 0 }),
    [],
  );
  useEffect(() => () => knobMat.dispose(), [knobMat]);
  const reduce = useMemo(reducedMotion, []);
  const camera = useThree((s) => s.camera);

  useFrame((state, rawDt) => {
    const dt = Math.min(rawDt, 1 / 20);
    const s = useVault.getState();
    const a = anim.current;
    const p = prev.current;

    // intro: the machine drops onto the turntable and settles
    if (s.ready) a.intro = reduce ? 1 : approach(a.intro, 1, dt / 1.25);
    const it = outCubic(a.intro);
    if (root.current) {
      root.current.position.y = (1 - it) * 0.26;
      root.current.rotation.y = -(1 - it) * 0.9;
    }
    if (!landed.current && a.intro > 0.97) {
      landed.current = true;
      if (!reduce) sfx('press', { pitch: -14, gain: 0.45 });
    }

    // crank → capsule → unfold, chained so each step waits for the previous
    const want = s.unlocked;
    const keyT = want ? 1 : a.door < 0.02 ? 0 : 1;
    const doorT = want ? (a.key > 0.98 ? 1 : 0) : a.explode < 0.02 ? 0 : 1;
    const expT = want && s.exploded && a.door > 0.96 ? 1 : 0;
    const k = reduce ? 6 : 1;
    // a full turn ends where it started, so the crank resets instantly on close
    a.key = keyT ? approach(a.key, 1, dt * 1.05 * k) : 0;
    a.door = approach(a.door, doorT, dt * (doorT ? 0.62 : 0.9) * k);
    a.explode = approach(a.explode, expT, dt * (expT ? 0.72 : 1.05) * k);

    // ratchet ticks while the crank turns, then sounds on edges
    if (a.key > 0 && a.key < 1 && !reduce) {
      const step = Math.floor(a.key * 8);
      if (step !== tickAt.current) {
        tickAt.current = step;
        sfx('tick', { pitch: step - 4, gain: 0.7 });
      }
    }
    if (a.key === 0) tickAt.current = 0;
    if (p.key < 1 && a.key === 1) sfx('press', { pitch: -6, gain: 0.8 });
    if (p.door === 0 && a.door > 0) sfx('pop', { pitch: -6, gain: 0.6 });
    if (p.door < 0.35 && a.door >= 0.35 && doorT) sfx('press', { pitch: -15, gain: 0.55 });
    if (p.door < 0.8 && a.door >= 0.8 && doorT) sfx('pop', { pitch: 4, gain: 0.7 });
    if (p.door > 0 && a.door === 0) sfx('press', { pitch: -15, gain: 0.6 });
    if (p.explode === 0 && a.explode > 0) sfx('whoosh', { gain: 0.7 });
    if (p.explode < 1 && a.explode === 1) sfx('lights-on', { gain: 0.5 });
    if (p.explode === 1 && a.explode < 1) sfx('whoosh', { pitch: -5, gain: 0.55 });
    p.key = a.key;
    p.door = a.door;
    p.explode = a.explode;

    // status for the HTML side
    let st: VaultStatus;
    if (a.key === 0 && a.door === 0) st = 'locked';
    else if (a.explode === 1) st = 'exploded';
    else if (a.door === 1 && a.explode === 0 && !(want && s.exploded)) st = 'open';
    else st = want ? 'unlocking' : 'closing';
    if (s.status !== st) s.setStatus(st);

    // transforms
    if (crank.current) crank.current.rotation.z = -backOut(a.key, 0.6) * TAU;
    if (flap.current) {
      const d1 = clamp01(a.door / 0.4);
      flap.current.rotation.x = -Math.sin(clamp01(d1 * 1.15) * Math.PI) * 1.15;
    }
    // the pile settles a little after each turn
    if (pileRef.current) pileRef.current.position.y = a.key > 0 && a.key < 1 && !reduce ? Math.sin(a.key * Math.PI * 6) * 0.0015 : 0;
    const hoverKey = s.hover === 'key' && a.key === 0;
    const hint = s.status === 'locked' && a.intro >= 1 && !reduce ? 0.06 + Math.sin(state.clock.elapsedTime * 2.6) * 0.06 : 0;
    knobMat.emissiveIntensity = THREE.MathUtils.lerp(knobMat.emissiveIntensity, hoverKey ? 0.4 : hint, 0.2);
  });

  const block = (e: ThreeEvent<PointerEvent | MouseEvent>) => e.stopPropagation();
  const camInFront = () => {
    const local = root.current ? root.current.worldToLocal(camera.position.clone()) : camera.position;
    return local.z > 0.05;
  };
  const keyOver = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    if (!camInFront()) return;
    if (useVault.getState().hover !== 'key') sfx('hover');
    useVault.getState().setHover('key');
  };
  const keyOut = () => {
    if (useVault.getState().hover === 'key') useVault.getState().setHover(null);
  };
  const keyClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (e.delta > 6 || !camInFront()) return;
    useVault.getState().turnKey();
  };

  return (
    <group ref={root} position={[0, 0.26, 0]}>
      {/* body: blocks pointer events from reaching anything behind it */}
      <group onPointerOver={block} onPointerMove={block} onClick={block}>
        {/* skirt + base */}
        <RBox size={[W + 0.008, SKIRT_H, D + 0.008]} radius={0.006} material="pinkDeep" position={[0, SKIRT_H / 2, 0]} />
        <RBox size={[W, BASE_H, D]} radius={0.018} material="pinkPlastic" position={[0, SKIRT_H + BASE_H / 2, 0]} />
        {/* dome: clear acrylic with pink corner posts and a pink back board */}
        <RBox size={[DOME_W - 0.02, DOME_H - 0.004, 0.006]} radius={0.003} material="pinkPlastic" position={[0, DOME_Y, -DOME_D / 2 + 0.008]} />
        {[
          [-1, -1],
          [1, -1],
          [-1, 1],
          [1, 1],
        ].map(([x, z], i) => (
          <RBox key={i} size={[0.014, DOME_H, 0.014]} radius={0.005} material="pinkPlastic" position={[x * (DOME_W / 2 - 0.006), DOME_Y, z * (DOME_D / 2 - 0.006)]} />
        ))}
        <group ref={pileRef}>
          <CapsulePile n={low ? 10 : 18} />
        </group>
        <RBox size={[DOME_W, DOME_H, DOME_D]} radius={0.016} smoothness={low ? 2 : 4} material="acrylic" position={[0, DOME_Y, 0]} castShadow={false} />
        {/* cap + a chrome lock + the engraving on top */}
        <RBox size={[W + 0.006, CAP_H, D + 0.006]} radius={0.016} material="pinkPlastic" position={[0, CAP_Y, 0]} />
        <RBox size={[W - 0.03, 0.004, D - 0.03]} radius={0.002} material="pinkDeep" position={[0, TOP + 0.0008, 0]} castShadow={false} />
        <Cyl r={0.0065} h={0.004} material="chrome" position={[0.074, CAP_Y + 0.004, FRONT + 0.003]} rotation={[Math.PI / 2, 0, 0]} />
        <Cyl r={0.0026} h={0.002} material="ink" position={[0.074, CAP_Y + 0.004, FRONT + 0.0055]} rotation={[Math.PI / 2, 0, 0]} castShadow={false} />
        <Label size={0.0085} color={COLORS.ink2} anchorX="left" position={[-0.09, TOP + 0.0032, 0.07]} rotation={[-Math.PI / 2, 0, 0]}>
          TENDERLENS
        </Label>
        <Label size={0.0055} color={COLORS.ink3} anchorX="left" position={[-0.09, TOP + 0.0032, 0.056]} rotation={[-Math.PI / 2, 0, 0]}>
          PIPELINE · TL-v7 · 1 TURN = 1 CAPSULE
        </Label>
        <StatusLed />

        {/* crank escutcheon + printed hint */}
        <Cyl r={0.04} h={0.006} material="chrome" position={[CRANK[0], CRANK[1], FRONT + 0.003]} rotation={[Math.PI / 2, 0, 0]} />
        <Cyl r={0.032} h={0.004} material="satin" position={[CRANK[0], CRANK[1], FRONT + 0.0065]} rotation={[Math.PI / 2, 0, 0]} castShadow={false} />
        <Decal
          w={0.1}
          h={0.02}
          position={[CRANK[0], CRANK[1] - 0.056, FRONT + 0.0006]}
          draw={(ctx, w, h) => {
            txt(ctx, 'TURN ⟳ 360°', w / 2, h / 2, mono(700, 15), INK3, 'center', 3);
          }}
        />

        {/* chute: frame, dark mouth, a clear pink flap hinged at the top */}
        <RBox size={[0.074, 0.066, 0.008]} radius={0.012} material="pinkDeep" position={[CHUTE[0], CHUTE[1], FRONT + 0.003]} />
        <RBox size={[0.056, 0.048, 0.006]} radius={0.009} material="ink" position={[CHUTE[0], CHUTE[1], FRONT + 0.0055]} castShadow={false} />
        <group ref={flap} position={[CHUTE[0], CHUTE[1] + 0.024, FRONT + 0.0105]}>
          <RBox size={[0.054, 0.047, 0.004]} radius={0.008} material="acrylicTint" position={[0, -0.0235, 0]} castShadow={false} />
        </group>
        {/* label plate above the chute */}
        <RBox size={[0.074, 0.03, 0.004]} radius={0.004} material="white" position={[CHUTE[0], 0.13, FRONT + 0.002]} />
        <Decal
          w={0.07}
          h={0.026}
          position={[CHUTE[0] - 0.003, 0.13, FRONT + 0.0045]}
          draw={(ctx, w, h) => {
            txt(ctx, 'TL-v7', 10, h * 0.36, mono(700, 22), INK, 'left', 2);
            txt(ctx, 'ONE TURN · ONE CAPSULE', 10, h * 0.74, mono(500, 11), INK3, 'left', 1);
          }}
        />
        <Led color={COLORS.blue} blink={0} r={0.0028} position={[CHUTE[0] + 0.03, 0.137, FRONT + 0.004]} />
        {/* feet */}
        {[
          [-1, -1],
          [1, -1],
          [-1, 1],
          [1, 1],
        ].map(([x, z], i) => (
          <Cyl key={i} r={0.012} h={0.004} material="rubber" position={[x * 0.096, -0.002, z * 0.084]} castShadow={false} />
        ))}
      </group>

      {/* the crank: chrome bar, hub and a pink knob */}
      <group ref={crank} position={[CRANK[0], CRANK[1], FRONT + 0.009]} onPointerOver={keyOver} onPointerOut={keyOut} onClick={keyClick}>
        <RBox size={[0.07, 0.018, 0.012]} radius={0.006} material="chrome" position={[0, 0, 0.006]} />
        <Cyl r={0.013} h={0.016} material="chrome" position={[0, 0, 0.008]} rotation={[Math.PI / 2, 0, 0]} />
        <Cyl r={0.0095} h={0.02} material={knobMat} position={[0.028, 0, 0.022]} rotation={[Math.PI / 2, 0, 0]} />
        <mesh position={[0.028, 0, 0.032]} material={knobMat} raycast={noRay}>
          <sphereGeometry args={[0.0095, 20, 10, 0, TAU, 0, Math.PI / 2]} />
        </mesh>
        {/* generous invisible hit area */}
        <mesh position={[0, 0, 0.014]} visible={false}>
          <boxGeometry args={[0.1, 0.1, 0.04]} />
        </mesh>
      </group>

      <Capsule anim={anim} />

      {/* the modules — folded inside the capsule until it opens */}
      {ORDER.map((id, i) => (
        <Module key={id} id={id} index={i} anim={anim} layout={layout} />
      ))}
    </group>
  );
}

function StatusLed() {
  const status = useVault((s) => s.status);
  const open = status !== 'locked';
  return <Led color={open ? COLORS.blue : COLORS.pink} blink={open ? 0 : 0.8} r={0.0036} position={[-0.09, CAP_Y + 0.004, FRONT + 0.003]} rotation={[0, 0, 0]} />;
}

/* ------------------------------------------------------------------ the dropped capsule */
function Capsule({ anim }: { anim: MutableRefObject<Anim> }) {
  const g = useRef<THREE.Group>(null);
  const roll = useRef<THREE.Group>(null);
  const lid = useRef<THREE.Group>(null);
  const geo = useMemo(
    () => ({
      top: new THREE.SphereGeometry(CAPSULE_R, 32, 16, 0, TAU, 0, Math.PI / 2),
      bot: new THREE.SphereGeometry(CAPSULE_R, 32, 16, 0, TAU, Math.PI / 2, Math.PI / 2),
      band: new THREE.TorusGeometry(CAPSULE_R * 1.002, 0.0016, 8, 48),
    }),
    [],
  );
  const lidMat = useMemo(() => new THREE.MeshPhysicalMaterial({ color: COLORS.pink, roughness: 0.18, clearcoat: 1, clearcoatRoughness: 0.08, transparent: true, opacity: 0.88 }), []);
  const cupMat = useMemo(() => new THREE.MeshPhysicalMaterial({ color: '#ffffff', roughness: 0.12, clearcoat: 1, clearcoatRoughness: 0.06, transparent: true, opacity: 0.6, side: THREE.DoubleSide, depthWrite: false }), []);
  useEffect(
    () => () => {
      geo.top.dispose();
      geo.bot.dispose();
      geo.band.dispose();
      lidMat.dispose();
      cupMat.dispose();
    },
    [geo, lidMat, cupMat],
  );
  const start: V3 = [CHUTE[0], CHUTE[1], FRONT - 0.02];
  const mouth: V3 = [CHUTE[0], CAPSULE_R, FRONT + 0.05];

  useFrame(() => {
    const a = anim.current;
    const grp = g.current;
    if (!grp) return;
    grp.visible = a.door > 0.001;
    if (!grp.visible) return;
    const d1 = clamp01(a.door / 0.4);
    const d2 = inOut(clamp01((a.door - 0.4) / 0.38));
    const d3 = inOut(clamp01((a.door - 0.8) / 0.2));
    // 1 · out of the chute and down to the turntable
    let x = start[0];
    let y = lerp(start[1], mouth[1], inQuad(d1));
    let z = lerp(start[2], mouth[2], outCubic(d1));
    // 2 · roll to the front
    x = lerp(x, REST[0], d2);
    y = lerp(y, REST[1], d2) + Math.sin(d2 * Math.PI) * 0.004;
    z = lerp(z, REST[2], d2);
    grp.position.set(x, y, z);
    if (roll.current) roll.current.rotation.x = d2 * TAU + (1 - d1) * 0.6;
    // 3 · the lid hinges open towards the back
    if (lid.current) {
      lid.current.rotation.x = -d3 * 1.95;
      lid.current.position.y = d3 * 0.004;
    }
  });

  const click = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (e.delta > 6) return;
    const s = useVault.getState();
    if (s.unlocked && !s.exploded) s.toggleExploded();
  };
  const over = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    if (anim.current.door < 0.96 || useVault.getState().exploded) return;
    if (useVault.getState().hover !== 'key') sfx('hover');
    useVault.getState().setHover('key');
  };

  return (
    <group ref={g} visible={false} onClick={click} onPointerOver={over} onPointerOut={() => useVault.getState().hover === 'key' && useVault.getState().setHover(null)}>
      <group ref={roll}>
        <mesh geometry={geo.bot} material={cupMat} castShadow />
        <mesh geometry={geo.band} material={mat('chrome')} rotation={[Math.PI / 2, 0, 0]} raycast={noRay} />
        {/* lid hinge at the back of the seam */}
        <group position={[0, 0, -CAPSULE_R]}>
          <group ref={lid}>
            <mesh geometry={geo.top} material={lidMat} position={[0, 0, CAPSULE_R]} castShadow />
          </group>
        </group>
      </group>
    </group>
  );
}

/* ------------------------------------------------------------------ modules */
const tmpA = new THREE.Vector3();
const FROM = new THREE.Vector3(REST[0], REST[1] + 0.012, REST[2]);

/** Out of the capsule (tiny, spinning) → up in an arc → its pose. Returns its own progress t. */
function modulePose(index: number, e: number, final: { p: V3; r: V3 }, out: THREE.Vector3, rot: THREE.Euler) {
  const stagger = 0.08;
  const t = clamp01((e - index * stagger) / (1 - stagger * 4));
  const a = inOut(t);
  out.set(lerp(FROM.x, final.p[0], a), lerp(FROM.y, final.p[1], a) + Math.sin(t * Math.PI) * 0.07, lerp(FROM.z, final.p[2], a));
  rot.set(final.r[0] * a, final.r[1] * a + (1 - a) * Math.PI * 1.2, final.r[2] * a);
  return t;
}

function Module({ id, index, anim, layout }: { id: ModuleId; index: number; anim: MutableRefObject<Anim>; layout: MutableRefObject<Layout> }) {
  const g = useRef<THREE.Group>(null);
  const glow = useRef(0);
  const haloMat = useMemo(
    () => new THREE.MeshBasicMaterial({ map: halo(), color: COLORS.baby, transparent: true, opacity: 0, depthWrite: false, toneMapped: false }),
    [],
  );
  useEffect(() => () => haloMat.dispose(), [haloMat]);
  const size = id === 'launch' ? LAUNCH_SIZE : MOD_SIZE;
  const rot = useMemo(() => new THREE.Euler(), []);
  const reduce = useMemo(reducedMotion, []);

  useFrame((state, dt) => {
    const a = anim.current;
    const s = useVault.getState();
    const grp = g.current;
    if (!grp) return;
    grp.visible = a.explode > 0.001;
    if (!grp.visible) return;
    const t = modulePose(index, a.explode, POSES[layout.current][id], tmpA, rot);
    const settled = reduce ? 0 : clamp01((a.explode - 0.94) / 0.06);
    const active = s.active === id && a.explode > 0.5;
    const hover = s.hover === id && a.door > 0.9;
    const tt = state.clock.elapsedTime;
    grp.position.copy(tmpA);
    grp.position.y += Math.sin(tt * 1.1 + index * 1.7) * 0.0035 * settled;
    grp.rotation.copy(rot);
    grp.rotation.y += Math.sin(tt * 0.6 + index) * 0.03 * settled;
    const unfold = 0.12 + 0.88 * outCubic(clamp01(t / 0.75));
    const sc = (active ? 1.08 : hover ? 1.035 : 1) * unfold;
    const cur = grp.scale.x + (sc - grp.scale.x) * Math.min(1, dt * 10);
    grp.scale.setScalar(t < 1 ? sc : cur);
    if (active) grp.position.z += 0.025 * settled;
    const target = a.explode * (active ? 0.9 : hover ? 0.6 : s.active ? 0.12 : 0.3);
    glow.current += (target - glow.current) * Math.min(1, dt * 6);
    haloMat.opacity = glow.current;
  });

  const over = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    if (anim.current.explode < 0.9) return;
    const s = useVault.getState();
    if (s.hover !== id) sfx('hover');
    s.setHover(id);
  };
  const out = () => {
    if (useVault.getState().hover === id) useVault.getState().setHover(null);
  };
  const click = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (e.delta > 6 || anim.current.explode < 0.9) return;
    useVault.getState().select(id);
  };

  const body = id === 'convert' ? 'pearl' : id === 'insight' ? 'ink' : 'pearl';
  return (
    <group ref={g} visible={false} position={REST} scale={0.12} onPointerOver={over} onPointerOut={out} onClick={click}>
      <mesh material={haloMat} position={[0, 0, -0.03]} raycast={noRay}>
        <planeGeometry args={[size[0] * 2.6, size[1] * (id === 'launch' ? 4.6 : 2.6)]} />
      </mesh>
      <RBox size={size} radius={0.009} material={body} />
      {id === 'story' && <CrawlPart anim={anim} />}
      {id === 'game' && <TriagePart anim={anim} />}
      {id === 'convert' && <CheckPart anim={anim} />}
      {id === 'insight' && <VerdictPart anim={anim} />}
      {id === 'launch' && <EvalPart anim={anim} />}
    </group>
  );
}

const FACE = MOD_SIZE[2] / 2;
const isLive = (id: ModuleId, a: Anim) => useVault.getState().active === id && a.explode > 0.96;

/* M1 · Crawl and read — a portal dial that steps through the night's run */
const STEPS = ['POLL', 'NEW', 'QUEUE', 'OCR', 'READ'];
const STEP_ANGLES = [0, 1, 2, 3, 4].map((k) => (-135 + k * 67.5) * (Math.PI / 180));
const DIAL_Y = -0.006;
function CrawlPart({ anim }: { anim: MutableRefObject<Anim> }) {
  const dial = useRef<THREE.Group>(null);
  const ledRef = useRef<THREE.Mesh>(null);
  const ring = useRef<THREE.Mesh>(null);
  const step = useRef(0);
  const clock = useRef(0);
  const angle = useRef(STEP_ANGLES[0]);
  const ledMat = useEmissive(COLORS.pink, 2);
  const ringMat = useEmissive(COLORS.blue, 0.6);
  useFrame((_, dt) => {
    const a = anim.current;
    if (isLive('story', a)) {
      clock.current += dt;
      if (clock.current > 0.7) {
        clock.current = 0;
        step.current = (step.current + 1) % 5;
        sfx('tick', { pitch: step.current * 2, gain: 0.8 });
      }
    } else {
      clock.current = 0.45;
      if (step.current !== 0 && a.explode < 0.5) step.current = 0;
    }
    const target = STEP_ANGLES[step.current];
    angle.current += (target - angle.current) * Math.min(1, dt * 9);
    if (dial.current) dial.current.rotation.z = -angle.current;
    const r = 0.0355;
    const ca = STEP_ANGLES[step.current];
    if (ledRef.current) ledRef.current.position.set(Math.sin(ca) * r, DIAL_Y + Math.cos(ca) * r, FACE + 0.0012);
    ringMat.emissiveIntensity = 0.25 + a.explode * (useVault.getState().active === 'story' ? 1.3 : 0.45);
    if (ring.current) ring.current.visible = a.explode > 0.02;
  });
  return (
    <group>
      <Decal
        w={0.1}
        h={0.095}
        position={[0, 0, FACE + 0.0003]}
        draw={(ctx, w, h) => {
          const cx = w / 2;
          const cy = h / 2 + (-DIAL_Y / 0.095) * h;
          txt(ctx, 'M1', 14, 18, mono(700, 15), PINK_INK, 'left', 1);
          txt(ctx, 'CRAWL', 44, 18, mono(700, 15), INK, 'left', 2);
          txt(ctx, '14 PORTALS', w - 14, 18, mono(500, 10), INK3, 'right', 1);
          for (let i = 0; i <= 40; i++) {
            const ang = (-135 + (i / 40) * 270) * (Math.PI / 180);
            const major = i % 10 === 0;
            ctx.strokeStyle = major ? INK : 'rgba(22,27,38,0.35)';
            ctx.lineWidth = major ? 3 : 1.4;
            const r0 = major ? 76 : 80;
            ctx.beginPath();
            ctx.moveTo(cx + Math.sin(ang) * r0, cy - Math.cos(ang) * r0);
            ctx.lineTo(cx + Math.sin(ang) * 88, cy - Math.cos(ang) * 88);
            ctx.stroke();
          }
          STEP_ANGLES.forEach((ang, i) => txt(ctx, STEPS[i], cx + Math.sin(ang) * 104, cy - Math.cos(ang) * 102, mono(700, 10.5), INK, 'center', 0));
          txt(ctx, '02:00 NIGHTLY · OCR ON SCANS', cx, h - 13, mono(500, 9.5), INK3, 'center', 1);
        }}
      />
      <mesh ref={ring} position={[0, DIAL_Y, FACE + 0.0008]} material={ringMat} raycast={noRay}>
        <ringGeometry args={[0.0305, 0.0322, 48]} />
      </mesh>
      <group ref={dial} position={[0, DIAL_Y, FACE]}>
        <group rotation={[Math.PI / 2, 0, 0]}>
          <Knob r={0.025} h={0.015} value={0.5} material="pearl" indicator="pinkGloss" />
        </group>
      </group>
      <mesh ref={ledRef} material={ledMat} raycast={noRay}>
        <sphereGeometry args={[0.0028, 12, 8]} />
      </mesh>
    </group>
  );
}

/* M2 · Page triage — label keys + a kept-pages LCD (~200 pages in, ~12 out) */
function TriagePart({ anim }: { anim: MutableRefObject<Anim> }) {
  const keys = [useRef<THREE.Group>(null), useRef<THREE.Group>(null), useRef<THREE.Group>(null)];
  const press = useRef([0, 0, 0]);
  const clock = useRef(0);
  const next = useRef(0);
  const kept = useRef(0);
  const seen = useRef(0);
  const lcd = useCanvasTexture(
    192,
    64,
    (ctx, w, h) => {
      ctx.fillStyle = COLORS.screen;
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = 'rgba(255,255,255,0.05)';
      for (let y = 4; y < h; y += 6) for (let x = 4; x < w; x += 6) ctx.fillRect(x, y, 2, 2);
      txt(ctx, String(kept.current).padStart(2, '0'), 12, h / 2 + 2, dot(38), COLORS.baby, 'left', 2);
      txt(ctx, 'KEPT', 74, h / 2 - 9, mono(700, 12), '#eef1f6', 'left', 1);
      txt(ctx, `${String(seen.current).padStart(3, '0')}/200`, 74, h / 2 + 11, mono(500, 12), 'rgba(238,241,246,0.6)', 'left', 1);
    },
    10,
  );
  const lcdMat = useScreenMaterial(lcd, 1.05);
  useFrame((_, dt) => {
    const a = anim.current;
    if (isLive('game', a)) {
      clock.current += dt;
      if (clock.current > 0.5) {
        clock.current = 0;
        const i = next.current;
        press.current[i] = 1;
        next.current = (i + 1) % 3;
        // two pages labelled and skipped for every one kept, roughly
        seen.current = seen.current >= 200 ? 0 : seen.current + 17;
        if (i < 2) kept.current = kept.current >= 12 ? 0 : kept.current + 1;
        sfx('key', { pitch: i * 3, gain: 0.9 });
        if (kept.current === 12 && i < 2) setTimeout(() => sfx('coin', { gain: 0.45 }), 90);
      }
    } else clock.current = 0.4;
    keys.forEach((k, i) => {
      press.current[i] = Math.max(0, press.current[i] - dt * 6);
      if (k.current) k.current.position.z = FACE + 0.006 - press.current[i] * 0.0045;
    });
  });
  return (
    <group>
      <Decal
        w={0.1}
        h={0.095}
        position={[0, 0, FACE + 0.0003]}
        draw={(ctx, w, h) => {
          txt(ctx, 'M2', 14, 18, mono(700, 15), PINK_INK, 'left', 1);
          txt(ctx, 'TRIAGE', 44, 18, mono(700, 15), INK, 'left', 2);
          txt(ctx, '200 → 12', w - 14, 18, mono(500, 10), INK3, 'right', 1);
          ['ELIG', 'SCOPE', 'SKIP'].forEach((l, i) => txt(ctx, l, w / 2 + (i - 1) * 77, h - 16, mono(700, 10), INK3, 'center', 1));
        }}
      />
      <mesh position={[0, 0.019, FACE + 0.0006]} material={lcdMat} raycast={noRay}>
        <planeGeometry args={[0.078, 0.026]} />
      </mesh>
      {(['pearl', 'baby', 'pinkGloss'] as const).map((m, i) => (
        <group key={i} ref={keys[i]} position={[(i - 1) * 0.03, -0.021, FACE + 0.006]}>
          <RBox size={[0.025, 0.025, 0.012]} radius={0.0045} material={m} />
          <Label size={0.0046} color={INK} font="monoBold" position={[0, 0, 0.0062]}>
            {['EL', 'SC', 'SK'][i]}
          </Label>
        </group>
      ))}
    </group>
  );
}

/* M3 · Extract and check — the pink gate button; quote, page and numbers checked in code */
function CheckPart({ anim }: { anim: MutableRefObject<Anim> }) {
  const cap = useRef<THREE.Group>(null);
  const clock = useRef(0);
  const pressT = useRef(0);
  const capMat = useMemo(
    () => new THREE.MeshPhysicalMaterial({ color: COLORS.pink, roughness: 0.24, clearcoat: 1, clearcoatRoughness: 0.12, emissive: COLORS.pink, emissiveIntensity: 0.08 }),
    [],
  );
  useEffect(() => () => capMat.dispose(), [capMat]);
  const leds = [useEmissive(COLORS.blue, 0), useEmissive(COLORS.blue, 0), useEmissive(COLORS.green, 0)];
  useFrame((_, dt) => {
    const a = anim.current;
    const live = isLive('convert', a);
    if (live) {
      const before = clock.current;
      clock.current += dt;
      if (clock.current > 2) clock.current = 0;
      const c = clock.current;
      if (before < 0.05 && c >= 0.05) {
        pressT.current = 1;
        sfx('press', { gain: 0.9 });
      }
      [0.45, 0.75, 1.05].forEach((t, i) => {
        if (before < t && c >= t) sfx(i === 2 ? 'success' : 'beep', { pitch: i * 4, gain: i === 2 ? 0.45 : 0.5 });
      });
    } else clock.current = 1.85;
    pressT.current = Math.max(0, pressT.current - dt * 4);
    if (cap.current) cap.current.position.z = FACE + 0.006 - Math.sin(pressT.current * Math.PI) * 0.005;
    capMat.emissiveIntensity = 0.06 + a.explode * 0.12 + pressT.current * 0.7;
    const c = clock.current;
    leds.forEach((m, i) => {
      const on = live && c > [0.45, 0.75, 1.05][i] && c < 1.8;
      m.emissiveIntensity += ((on ? 2.4 : 0.05) - m.emissiveIntensity) * Math.min(1, dt * 14);
      m.color.set(on || i === 2 ? (i === 2 ? COLORS.green : COLORS.blue) : COLORS.ice4);
    });
  });
  return (
    <group>
      <Decal
        w={0.1}
        h={0.095}
        position={[0, 0, FACE + 0.0003]}
        draw={(ctx, w, h) => {
          txt(ctx, 'M3', 14, 18, mono(700, 15), PINK_INK, 'left', 1);
          txt(ctx, 'CHECK', 44, 18, mono(700, 15), INK, 'left', 2);
          txt(ctx, '99.4%', w - 14, 18, mono(500, 10), INK3, 'right', 1);
          ['QUOTE', 'PAGE', 'EXACT'].forEach((l, i) => txt(ctx, l, w / 2 + (i - 1) * 72, h - 12, mono(700, 10), INK3, 'center', 1));
        }}
      />
      <Cyl r={0.032} h={0.006} material="chrome" position={[0, 0.006, FACE + 0.003]} rotation={[Math.PI / 2, 0, 0]} />
      <group ref={cap} position={[0, 0.006, FACE + 0.006]}>
        <Cyl r={0.026} h={0.012} seg={40} material={capMat} position={[0, 0, 0.003]} rotation={[Math.PI / 2, 0, 0]} />
        <mesh material={capMat} position={[0, 0, 0.009]} rotation={[Math.PI / 2, 0, 0]} scale={[1, 0.22, 1]} raycast={noRay}>
          <sphereGeometry args={[0.026, 40, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
        </mesh>
      </group>
      {leds.map((m, i) => (
        <mesh key={i} material={m} position={[(i - 1) * 0.028, -0.034, FACE + 0.0006]} raycast={noRay}>
          <sphereGeometry args={[0.0028, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
        </mesh>
      ))}
    </group>
  );
}

/* M4 · Verdict rules — a dot-matrix screen: Bid / Check / No / Can't tell yet */
const VERDICTS: { k: string; c: string }[] = [
  { k: 'BID', c: COLORS.baby },
  { k: 'CHECK', c: COLORS.pink },
  { k: 'NO', c: '#c5cad2' },
  { k: "CAN'T TELL", c: COLORS.yellow },
];
function VerdictPart({ anim }: { anim: MutableRefObject<Anim> }) {
  const counts = useRef([14, 9, 6, 3]);
  const cur = useRef(0);
  const acc = useRef(0);
  const tex = useCanvasTexture(
    256,
    192,
    (ctx, w, h) => {
      const live = useVault.getState().active === 'insight';
      ctx.fillStyle = COLORS.screen;
      ctx.fillRect(0, 0, w, h);
      // dot-matrix bars, one per verdict
      const step = 8;
      const rows = 9;
      const top = 82;
      const colW = 56;
      const max = Math.max(...counts.current, 1);
      VERDICTS.forEach((v, i) => {
        const x0 = 14 + i * colW;
        const lit = Math.max(1, Math.round((counts.current[i] / max) * rows));
        for (let r = 0; r < rows; r++)
          for (let c = 0; c < 5; c++) {
            const on = r < lit;
            ctx.fillStyle = on ? v.c : 'rgba(255,255,255,0.06)';
            ctx.globalAlpha = on ? (i === cur.current ? 1 : 0.55) : 1;
            ctx.fillRect(x0 + c * step, top + (rows - 1 - r) * step, 4, 4);
          }
        ctx.globalAlpha = 1;
        txt(ctx, v.k === "CAN'T TELL" ? '?' : v.k[0], x0 + 18, h - 22, mono(700, 11), i === cur.current ? '#eef1f6' : 'rgba(238,241,246,0.5)', 'center', 0);
      });
      const v = VERDICTS[cur.current];
      txt(ctx, 'VERDICT', 12, 16, mono(700, 12), '#eef1f6', 'left', 2);
      txt(ctx, live ? '● 06:30' : '06:30', w - 12, 16, mono(700, 11), live ? COLORS.pink : 'rgba(238,241,246,0.5)', 'right', 1);
      txt(ctx, v.k, 12, 46, dot(v.k.length > 6 ? 24 : 32), v.c, 'left', 1);
      txt(ctx, 'RULES IN CODE', w - 12, h - 8, mono(500, 9), 'rgba(238,241,246,0.45)', 'right', 1);
    },
    12,
  );
  const screen = useScreenMaterial(tex, 1.15);
  useFrame((_, dt) => {
    const a = anim.current;
    const live = isLive('insight', a);
    acc.current += dt * (live ? 1.6 : 0.4);
    if (acc.current > 1) {
      acc.current = 0;
      cur.current = (cur.current + 1) % VERDICTS.length;
      counts.current[cur.current] += 1;
      if (counts.current.some((c) => c > 40)) counts.current = [14, 9, 6, 3];
      if (live) sfx('tick', { pitch: 12 - cur.current * 3, gain: 0.3 });
    }
    screen.emissiveIntensity = 0.95 + (useVault.getState().active === 'insight' ? 0.35 : 0) * a.explode;
  });
  return (
    <group>
      <mesh position={[0, 0.007, FACE + 0.0005]} material={screen} raycast={noRay}>
        <planeGeometry args={[0.094, 0.0705]} />
      </mesh>
      <Decal
        w={0.1}
        h={0.016}
        px={256}
        position={[0, -0.0415, FACE + 0.0003]}
        draw={(ctx, w, h) => {
          txt(ctx, 'M4', 6, h / 2, mono(700, 15), COLORS.pink, 'left', 1);
          txt(ctx, 'VERDICT', 36, h / 2, mono(700, 15), '#eef1f6', 'left', 2);
          void w;
        }}
      />
    </group>
  );
}

/* EV · The eval cartridge — a marquee on a slim cartridge */
function EvalPart({ anim }: { anim: MutableRefObject<Anim> }) {
  const off = useRef(0);
  const tex = useCanvasTexture(
    512,
    64,
    (ctx, w, h) => {
      ctx.fillStyle = COLORS.screen;
      ctx.fillRect(0, 0, w, h);
      const msg = 'EVAL CARTRIDGE · 180 FIELDS IN CI · V6 BLOCKED · V7 SHIPPED · ';
      ctx.font = dot(40);
      const mw = ctx.measureText(msg).width + 24;
      const x0 = -(off.current % mw);
      for (let x = x0; x < w; x += mw) txt(ctx, msg, x, h / 2 + 3, dot(40), COLORS.baby, 'left', 2);
    },
    20,
  );
  const screen = useScreenMaterial(tex, 1.05);
  useFrame((_, dt) => {
    const a = anim.current;
    off.current += dt * (isLive('launch', a) ? 160 : 60);
  });
  const live = useVault((s) => s.active === 'launch');
  return (
    <group>
      <mesh position={[-0.008, 0, FACE + 0.0005]} material={screen} raycast={noRay}>
        <planeGeometry args={[0.15, 0.0185]} />
      </mesh>
      <Label size={0.0068} color={PINK_INK} font="monoBold" anchorX="left" position={[-0.096, 0, FACE + 0.0005]}>
        EV
      </Label>
      <Led color={COLORS.pink} blink={live ? 4 : 1} r={0.0032} position={[0.085, 0, FACE]} />
    </group>
  );
}

/* ------------------------------------------------------------------ camera rig */
interface Shot {
  target: V3;
  theta: number;
  phi: number;
  hw: number;
  hh: number;
  free?: boolean;
}

function shotFor(name: string, layout: Layout): Shot {
  if (name === 'intro') return { target: [0, 0.2, 0], theta: 1.05, phi: 1.0, hw: 0.8, hh: 0.62, free: true };
  if (name === 'closed') return { target: [0, 0.2, 0.03], theta: 0.48, phi: 1.2, hw: 0.32, hh: 0.27, free: true };
  if (name === 'capsule') return { target: [0, 0.17, 0.1], theta: 0.36, phi: 1.12, hw: 0.36, hh: 0.27 };
  if (name === 'exploded')
    return layout === 'wide'
      ? { target: [0, 0.28, 0.18], theta: 0.24, phi: 1.24, hw: 0.52, hh: 0.3 }
      : { target: [0, 0.34, 0.15], theta: 0.3, phi: 1.22, hw: 0.25, hh: 0.4 };
  const id = name.slice(2) as ModuleId;
  const p = POSES[layout][id];
  const wideMod = id === 'launch';
  return {
    target: [p.p[0], p.p[1] + (wideMod ? 0 : 0.004), p.p[2] + 0.02],
    theta: p.r[1] + 0.14,
    phi: Math.PI / 2 - 0.16 + p.r[0] * 0.6,
    hw: wideMod ? 0.16 : 0.115,
    hh: wideMod ? 0.07 : 0.105,
  };
}

function Rig({ anim, layout }: { anim: MutableRefObject<Anim>; layout: MutableRefObject<Layout> }) {
  const ref = useRef<CameraControlsImpl>(null);
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const size = useThree((s) => s.size);
  const gl = useThree((s) => s.gl);
  const last = useRef('');
  const idle = useRef(0);
  const introAt = useRef(0);
  const reduce = useMemo(reducedMotion, []);

  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const A = CameraControlsImpl.ACTION;
    c.mouseButtons.right = A.NONE;
    c.mouseButtons.middle = A.DOLLY;
    c.mouseButtons.wheel = A.DOLLY;
    c.touches.one = A.TOUCH_ROTATE;
    c.touches.two = A.TOUCH_DOLLY;
    c.touches.three = A.NONE;
    c.minPolarAngle = 0.32;
    c.maxPolarAngle = 1.5;
    c.smoothTime = 0.55;
    c.draggingSmoothTime = 0.14;
    c.azimuthRotateSpeed = 0.8;
    c.polarRotateSpeed = 0.6;
    c.dollySpeed = 0.5;
    c.restThreshold = 0.002;
    const wake = () => (idle.current = 0);
    gl.domElement.addEventListener('pointermove', wake);
    gl.domElement.addEventListener('pointerdown', wake);
    gl.domElement.addEventListener('wheel', wake, { passive: true });
    return () => {
      gl.domElement.removeEventListener('pointermove', wake);
      gl.domElement.removeEventListener('pointerdown', wake);
      gl.domElement.removeEventListener('wheel', wake);
    };
  }, [gl]);

  const apply = (c: CameraControlsImpl, name: string, transition: boolean) => {
    const s = shotFor(name, layout.current);
    const vf = THREE.MathUtils.degToRad(camera.fov) / 2;
    const tv = Math.tan(vf);
    const th = tv * (size.width / Math.max(1, size.height));
    const dist = Math.max(s.hh / tv, s.hw / th) * 1.08;
    // shortest way round
    const cur = c.azimuthAngle;
    let w = ((cur % TAU) + TAU) % TAU;
    if (w > Math.PI) w -= TAU;
    c.azimuthAngle = w;
    let d = s.theta - w;
    d = ((((d + Math.PI) % TAU) + TAU) % TAU) - Math.PI;
    const az = w + d;
    c.minAzimuthAngle = s.free ? -Infinity : az - 1.25;
    c.maxAzimuthAngle = s.free ? Infinity : az + 1.25;
    c.minDistance = name === 'intro' ? 0.1 : dist * 0.5;
    c.maxDistance = name === 'intro' ? 20 : dist * 2.1;
    c.moveTo(s.target[0], s.target[1], s.target[2], transition);
    c.rotateTo(az, s.phi, transition);
    c.dollyTo(dist, transition);
  };

  useFrame((state, dt) => {
    const c = ref.current;
    if (!c) return;
    const s = useVault.getState();
    const a = anim.current;
    let shot = 'intro';
    if (s.ready) {
      if (s.unlocked && s.exploded && a.door > 0.9) shot = s.active && a.explode > 0.9 ? `m:${s.active}` : 'exploded';
      else if (s.unlocked && a.key > 0.98) shot = 'capsule';
      else shot = 'closed';
    }
    const key = `${shot}|${layout.current}|${size.width}x${size.height}|${s.viewNonce}`;
    if (key !== last.current) {
      const first = last.current === '';
      const fromIntro = last.current.startsWith('intro|') && shot === 'closed';
      last.current = key;
      if (fromIntro) {
        c.smoothTime = reduce ? 0.01 : 1.05;
        introAt.current = state.clock.elapsedTime;
      } else if (state.clock.elapsedTime - introAt.current > 1.6) c.smoothTime = reduce ? 0.01 : 0.6;
      apply(c, shot, !first);
      idle.current = 0;
    }
    if (introAt.current && state.clock.elapsedTime - introAt.current > 1.6 && c.smoothTime > 0.7) c.smoothTime = 0.6;
    // idle turntable (closed) — slow, stops as soon as the visitor touches anything
    idle.current += dt;
    if (!reduce && shot === 'closed' && idle.current > 4.5 && !s.hover) {
      const ease = clamp01((idle.current - 4.5) / 2);
      c.azimuthAngle = c.azimuthAngle + Math.min(dt, 0.05) * 0.16 * ease;
    }
  });

  return <CameraControls ref={ref} makeDefault onControlStart={() => (idle.current = -3)} />;
}
