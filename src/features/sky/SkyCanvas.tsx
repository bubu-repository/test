"use client";

import { useEffect, useRef } from "react";
import { isLiteDevice } from "@/lib/lite";
import { cn } from "@/lib/cn";
import { unlock } from "@/lib/stickers";
import { useWeather } from "../widgets/weather";
import { SKY_FRAGMENT, SKY_VERTEX } from "./sky-shader";

function compile(gl: WebGLRenderingContext, type: number, source: string) {
  const shader = gl.createShader(type)!;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader) ?? "compile failed");
  return shader;
}

/** Cloud cover (0–100 %) and WMO code → shader uniforms. */
function skyFromWeather(cloudCover: number | null | undefined, code: number | null | undefined) {
  const cover = cloudCover == null ? 0 : -0.28 + (cloudCover / 100) * 0.62;
  const storm = code == null ? 0 : code >= 95 ? 1 : code >= 51 ? 0.6 : code === 3 ? 0.25 : 0;
  return { cover, storm };
}

/**
 * The live sky behind the hero. It sits on top of a still frame of itself (the parent's
 * `sky-stage` background), so there is no flash while WebGL starts, and nothing breaks without it.
 */
export function SkyCanvas({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const weather = useWeather();
  const weatherRef = useRef({ cover: 0, storm: 0 });

  useEffect(() => {
    weatherRef.current = skyFromWeather(weather?.cloudCover, weather?.code);
  }, [weather]);

  useEffect(() => {
    const canvas = canvasRef.current!;
    // Cheap phones and metered data keep the still frame underneath.
    if (isLiteDevice()) return;
    const gl = canvas.getContext("webgl", { alpha: false, antialias: false, powerPreference: "low-power", preserveDrawingBuffer: false });
    if (!gl) return;
    let program: WebGLProgram;
    try {
      program = gl.createProgram()!;
      gl.attachShader(program, compile(gl, gl.VERTEX_SHADER, SKY_VERTEX));
      gl.attachShader(program, compile(gl, gl.FRAGMENT_SHADER, SKY_FRAGMENT));
      gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error("link failed");
    } catch (error) {
      console.warn("Live sky unavailable, using the still frame.", error);
      return;
    }
    gl.useProgram(program);
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const aPos = gl.getAttribLocation(program, "aPos");
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
    const u = (name: string) => gl.getUniformLocation(program, name);
    const U = { res: u("uRes"), time: u("uTime"), mouse: u("uMouse"), cover: u("uCover"), storm: u("uStorm"), dark: u("uDark"), seed: u("uSeed"), warm: u("uWarm") };

    const coarse = window.matchMedia("(pointer: coarse)").matches;
    const calm = window.matchMedia("(prefers-reduced-motion: reduce)");
    const scale = coarse ? 0.38 : 0.5;
    const frameMs = coarse ? 1000 / 30 : 1000 / 60;

    const resize = () => {
      const r = canvas.getBoundingClientRect();
      canvas.width = Math.max(1, Math.round(r.width * scale * Math.min(window.devicePixelRatio || 1, 2)));
      canvas.height = Math.max(1, Math.round(r.height * scale * Math.min(window.devicePixelRatio || 1, 2)));
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform2f(U.res, canvas.width, canvas.height);
      wake();
    };

    const state = { time: 52 + Math.random() * 20, mx: -1, my: -1, tx: -1, ty: -1, parted: 0, cover: 0, storm: 0 };
    const onPointer = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      const inside = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
      if (!inside) {
        state.tx = state.ty = -1;
        return;
      }
      state.tx = (e.clientX - r.left) / r.width;
      state.ty = 1 - (e.clientY - r.top) / r.height;
      if (state.mx < 0) {
        state.mx = state.tx;
        state.my = state.ty;
      }
      state.parted += Math.abs(e.movementX) + Math.abs(e.movementY);
      if (state.parted > 2400) unlock("clouds");
      wake();
    };

    let raf = 0;
    let running = false;
    let visible = true;
    let last = performance.now();
    let acc = 0;
    let painted = false;

    const draw = () => {
      const root = document.documentElement;
      const dark = root.getAttribute("data-theme") === "dark" ? 1 : 0;
      const daypart = root.getAttribute("data-daypart");
      gl.uniform1f(U.time, state.time);
      gl.uniform2f(U.mouse, state.mx, state.my);
      gl.uniform1f(U.cover, state.cover);
      gl.uniform1f(U.storm, state.storm);
      gl.uniform1f(U.dark, dark);
      gl.uniform1f(U.seed, 0.3);
      gl.uniform1f(U.warm, daypart === "dawn" || daypart === "dusk" ? 1 : 0);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      if (!painted) {
        painted = true;
        canvas.style.opacity = "1";
      }
    };

    const frame = (now: number) => {
      const dt = now - last;
      last = now;
      acc += dt;
      const still = calm.matches;
      if (acc >= frameMs || still) {
        if (!still) state.time += acc / 1000;
        acc = 0;
        // Ease the cloud parting toward the pointer (or away when it leaves).
        if (state.tx < 0) {
          state.mx = state.mx < 0 ? -1 : state.mx + (Math.min(1.6, state.mx + 0.2) - state.mx) * 0.02;
          if (state.mx > 1.5) state.mx = state.my = -1;
        } else {
          state.mx += (state.tx - state.mx) * 0.08;
          state.my += (state.ty - state.my) * 0.08;
        }
        state.cover += (weatherRef.current.cover - state.cover) * 0.02;
        state.storm += (weatherRef.current.storm - state.storm) * 0.02;
        draw();
      }
      const settling = Math.abs(weatherRef.current.cover - state.cover) > 0.002 || (state.tx >= 0 && Math.abs(state.tx - state.mx) > 0.002);
      if (visible && !document.hidden && (!still || settling)) raf = requestAnimationFrame(frame);
      else running = false;
    };
    function wake() {
      if (running || !visible || document.hidden) return;
      running = true;
      last = performance.now();
      raf = requestAnimationFrame(frame);
    }

    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) wake();
    });
    io.observe(canvas);
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    const mo = new MutationObserver(() => {
      draw();
      wake();
    });
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    const onVisibility = () => !document.hidden && wake();
    window.addEventListener("pointermove", onPointer, { passive: true });
    document.addEventListener("visibilitychange", onVisibility);
    resize();

    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      ro.disconnect();
      mo.disconnect();
      window.removeEventListener("pointermove", onPointer);
      document.removeEventListener("visibilitychange", onVisibility);
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      data-xr="SkyCanvas · fBm clouds in GLSL, cover from Bekasi's live weather"
      className={cn("pointer-events-none absolute inset-0 h-full w-full opacity-0 transition-opacity duration-700", className)}
    />
  );
}
