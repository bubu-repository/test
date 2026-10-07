/*
 * Bloom: GPU engine.
 * Gray–Scott reaction–diffusion on WebGL2 with ping-pong framebuffers.
 * State texture: R = chemical A, G = chemical B. Sim space has y pointing up (GL convention).
 */

const VERT = `#version 300 es
in vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }`;

/* One Gray–Scott step (Karl Sims' formulation: dA = 1.0, dB = 0.5, dt = 1, 3x3 Laplacian), wrapping edges. */
const SIM = `#version 300 es
precision highp float;
precision highp int;
uniform highp sampler2D uState;
uniform float uFeed;
uniform float uKill;
out vec4 outColor;

vec2 at(ivec2 p, ivec2 s) { return texelFetch(uState, (p + s) % s, 0).rg; }

void main() {
  ivec2 s = textureSize(uState, 0);
  ivec2 p = ivec2(gl_FragCoord.xy);
  vec2 c = texelFetch(uState, p, 0).rg;
  vec2 edges = at(p + ivec2(1, 0), s) + at(p + ivec2(-1, 0), s) + at(p + ivec2(0, 1), s) + at(p + ivec2(0, -1), s);
  vec2 corners = at(p + ivec2(1, 1), s) + at(p + ivec2(-1, 1), s) + at(p + ivec2(1, -1), s) + at(p + ivec2(-1, -1), s);
  vec2 lap = 0.2 * edges + 0.05 * corners - c;
  float abb = c.r * c.g * c.g;
  float a = c.r + (1.0 * lap.r - abb + uFeed * (1.0 - c.r));
  float b = c.g + (0.5 * lap.g + abb - (uKill + uFeed) * c.g);
  outColor = vec4(clamp(a, 0.0, 1.0), clamp(b, 0.0, 1.0), 0.0, 1.0);
}`;

/* Paints (or erases) a soft capsule from uP0 to uP1, in sim cells. */
const PAINT = `#version 300 es
precision highp float;
uniform highp sampler2D uState;
uniform vec2 uP0;
uniform vec2 uP1;
uniform float uRadius;
uniform float uErase;
out vec4 outColor;

void main() {
  vec4 c = texelFetch(uState, ivec2(gl_FragCoord.xy), 0);
  vec2 q = gl_FragCoord.xy;
  vec2 pa = q - uP0;
  vec2 ba = uP1 - uP0;
  float t = clamp(dot(pa, ba) / max(dot(ba, ba), 1e-5), 0.0, 1.0);
  float d = length(pa - ba * t);
  float m = 1.0 - smoothstep(uRadius * 0.6, uRadius, d);
  if (uErase > 0.5) {
    c.r = mix(c.r, 1.0, m);
    c.g = mix(c.g, 0.0, m);
  } else {
    c.g = max(c.g, 0.9 * m);
    c.r = min(c.r, 1.0 - 0.5 * m);
  }
  outColor = c;
}`;

/* Resamples an old state texture into a new size (used on resize). */
const COPY = `#version 300 es
precision highp float;
uniform highp sampler2D uSrc;
uniform vec2 uDst;
out vec4 outColor;
void main() { outColor = texture(uSrc, gl_FragCoord.xy / uDst); }`;

/* The look: magenta ink on a plain stage, with a soft relief so the shapes read as living tissue. */
const RENDER = (manualBilinear) => `#version 300 es
precision highp float;
precision highp int;
${manualBilinear ? "#define MANUAL_BILINEAR 1" : ""}
uniform highp sampler2D uState;
uniform vec2 uSim;
uniform vec2 uRes;
uniform float uDark;
uniform vec3 uGround;   // --surface-2: the plain stage
uniform vec3 uAccent;   // --accent
uniform vec3 uDeep;     // --accent-strong
out vec4 outColor;

float sB(vec2 uv) {
#ifdef MANUAL_BILINEAR
  vec2 p = uv * uSim - 0.5;
  vec2 f = fract(p);
  ivec2 s = ivec2(uSim);
  ivec2 i = (ivec2(floor(p)) + s * 2) % s;
  ivec2 j = (i + 1) % s;
  float a = texelFetch(uState, i, 0).g;
  float b = texelFetch(uState, ivec2(j.x, i.y), 0).g;
  float c = texelFetch(uState, ivec2(i.x, j.y), 0).g;
  float d = texelFetch(uState, j, 0).g;
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
#else
  return texture(uState, uv).g;
#endif
}

float height(float b) { return smoothstep(0.05, 0.30, b); }

void main() {
  vec2 uv = gl_FragCoord.xy / uRes;
  vec2 tx = 1.0 / uSim;
  bool dark = uDark > 0.5;

  float b = sB(uv);

  // ---- two rings of 8 taps: fine for crisp edges, coarse for a gentle, rounded relief ----
  float rA = 1.5;
  float rB = 4.0;
  vec2 gFine = vec2(0.0);
  vec2 gCoarse = vec2(0.0);
  for (int i = 0; i < 8; i++) {
    float a = float(i) * 0.7853982 + 0.3926991;
    vec2 d = vec2(cos(a), sin(a));
    gFine += height(sB(uv + d * rA * tx)) * d;
    gCoarse += sB(uv + d * rB * tx) * d;
  }
  gFine /= 4.0 * rA;
  gCoarse /= 4.0 * rB;
  vec3 n = normalize(vec3(-(gFine * 0.9 + gCoarse * 2.0), 1.0));

  // ---- the ink: flat magenta, a touch lighter where it faces the light, deeper on the far side ----
  vec3 L = normalize(vec3(-0.55, 0.6, 0.7));
  float lit = dot(n.xy, normalize(L.xy));
  vec3 Hv = normalize(L + vec3(0.0, 0.0, 1.0));
  float spec = pow(max(dot(n, Hv), 0.0), 70.0);

  vec3 tint = mix(uAccent, vec3(1.0), dark ? 0.22 : 0.3);
  vec3 ink = uAccent;
  ink = mix(ink, tint, smoothstep(0.0, 0.5, lit) * 0.5);
  ink = mix(ink, uDeep * (dark ? 0.82 : 0.88), smoothstep(0.0, 0.5, -lit) * 0.65);
  ink += vec3(spec * (dark ? 0.08 : 0.1));

  float cover = smoothstep(0.10, 0.16, b);
  vec3 col = mix(uGround, ink, cover);

  outColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}`;

function compile(gl, type, src) {
  const sh = gl.createShader(type);
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(sh);
    gl.deleteShader(sh);
    throw new Error("Shader compile failed: " + log);
  }
  return sh;
}

function program(gl, fragSrc) {
  const p = gl.createProgram();
  const vs = compile(gl, gl.VERTEX_SHADER, VERT);
  const fs = compile(gl, gl.FRAGMENT_SHADER, fragSrc);
  gl.attachShader(p, vs);
  gl.attachShader(p, fs);
  gl.bindAttribLocation(p, 0, "aPos");
  gl.linkProgram(p);
  gl.deleteShader(vs);
  gl.deleteShader(fs);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
    throw new Error("Program link failed: " + gl.getProgramInfoLog(p));
  }
  const u = {};
  const count = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
  for (let i = 0; i < count; i++) {
    const info = gl.getActiveUniform(p, i);
    u[info.name] = gl.getUniformLocation(p, info.name);
  }
  return { p, u };
}

/** Finds a float format we can render to. Returns null if none works. */
function pickFormat(gl) {
  const hasFloat = !!gl.getExtension("EXT_color_buffer_float");
  const hasHalf = hasFloat || !!gl.getExtension("EXT_color_buffer_half_float");
  const floatLinear = !!gl.getExtension("OES_texture_float_linear");
  const candidates = [];
  if (hasFloat) candidates.push({ internal: gl.RGBA32F, type: gl.FLOAT, linear: floatLinear, label: "RGBA32F" });
  if (hasHalf) candidates.push({ internal: gl.RGBA16F, type: gl.HALF_FLOAT, linear: true, label: "RGBA16F" });
  for (const fmt of candidates) {
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, fmt.internal, 4, 4, 0, gl.RGBA, fmt.type, null);
    const fb = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    const ok = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.deleteFramebuffer(fb);
    gl.deleteTexture(tex);
    if (ok) return fmt;
  }
  return null;
}

/**
 * Creates the GPU engine on `canvas`, or returns null when WebGL2 + a renderable float format
 * is not available (the caller then swaps in a fresh canvas for the CPU fallback).
 */
export function createGLEngine(canvas) {
  let gl = null;
  try {
    gl = canvas.getContext("webgl2", {
      alpha: false,
      antialias: false,
      depth: false,
      stencil: false,
      premultipliedAlpha: false,
      preserveDrawingBuffer: false,
      powerPreference: "high-performance",
    });
  } catch (e) {
    gl = null;
  }
  if (!gl) return null;

  const fmt = pickFormat(gl);
  if (!fmt) return null;

  let progs;
  try {
    progs = {
      sim: program(gl, SIM),
      paint: program(gl, PAINT),
      copy: program(gl, COPY),
      render: program(gl, RENDER(!fmt.linear)),
    };
  } catch (e) {
    console.warn("[bloom] GPU shaders unavailable, using the CPU garden.", e);
    return null;
  }

  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);
  const vbo = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

  let simW = 0;
  let simH = 0;
  let cssW = 1;
  let cssH = 1;
  let targets = []; // [{tex, fb}, {tex, fb}]
  let cur = 0;
  let feed = 0.0545;
  let kill = 0.062;
  let palette = null;
  let lost = false;

  function makeTarget(w, h) {
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, fmt.internal, w, h, 0, gl.RGBA, fmt.type, null);
    const filter = fmt.linear ? gl.LINEAR : gl.NEAREST;
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
    const fb = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    gl.clearBufferfv(gl.COLOR, 0, [1, 0, 0, 1]);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return { tex, fb };
  }

  function freeTargets(list) {
    for (const t of list) {
      gl.deleteFramebuffer(t.fb);
      gl.deleteTexture(t.tex);
    }
  }

  function simSizeFor(w, h) {
    const cell = 2; // CSS px per simulation cell
    let sw = Math.max(48, Math.round(w / cell));
    let sh = Math.max(48, Math.round(h / cell));
    const max = 320000;
    if (sw * sh > max) {
      const k = Math.sqrt(max / (sw * sh));
      sw = Math.round(sw * k);
      sh = Math.round(sh * k);
    }
    const lim = gl.getParameter(gl.MAX_TEXTURE_SIZE);
    return [Math.min(sw, lim), Math.min(sh, lim)];
  }

  function draw() {
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  const engine = {
    kind: "gpu",
    label: `WebGL2 · ${fmt.label}`,

    get simSize() {
      return [simW, simH];
    },

    resize(width, height, dpr) {
      if (lost) return;
      cssW = Math.max(1, width);
      cssH = Math.max(1, height);
      canvas.width = Math.max(1, Math.round(cssW * dpr));
      canvas.height = Math.max(1, Math.round(cssH * dpr));
      engine.dpr = canvas.width / cssW;
      const [nw, nh] = simSizeFor(cssW, cssH);
      if (!targets.length) {
        simW = nw;
        simH = nh;
        targets = [makeTarget(simW, simH), makeTarget(simW, simH)];
        cur = 0;
        return;
      }
      // Only resample when the grid changes noticeably, so small resizes keep the garden crisp.
      if (Math.abs(nw - simW) / simW < 0.06 && Math.abs(nh - simH) / simH < 0.06) return;
      const old = targets;
      const fresh = [makeTarget(nw, nh), makeTarget(nw, nh)];
      gl.useProgram(progs.copy.p);
      gl.bindFramebuffer(gl.FRAMEBUFFER, fresh[0].fb);
      gl.viewport(0, 0, nw, nh);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, old[cur].tex);
      gl.uniform1i(progs.copy.u.uSrc, 0);
      gl.uniform2f(progs.copy.u.uDst, nw, nh);
      draw();
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      freeTargets(old);
      targets = fresh;
      cur = 0;
      simW = nw;
      simH = nh;
    },

    setRecipe(f, k) {
      feed = f;
      kill = k;
    },

    setPalette(p) {
      palette = p;
    },

    clear() {
      if (lost) return;
      for (const t of targets) {
        gl.bindFramebuffer(gl.FRAMEBUFFER, t.fb);
        gl.clearBufferfv(gl.COLOR, 0, [1, 0, 0, 1]);
      }
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    },

    step(n) {
      if (lost || !targets.length) return;
      const { p, u } = progs.sim;
      gl.useProgram(p);
      gl.uniform1f(u.uFeed, feed);
      gl.uniform1f(u.uKill, kill);
      gl.uniform1i(u.uState, 0);
      gl.viewport(0, 0, simW, simH);
      gl.activeTexture(gl.TEXTURE0);
      for (let i = 0; i < n; i++) {
        const next = 1 - cur;
        gl.bindFramebuffer(gl.FRAMEBUFFER, targets[next].fb);
        gl.bindTexture(gl.TEXTURE_2D, targets[cur].tex);
        draw();
        cur = next;
      }
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    },

    /** u, v in 0..1 from the top-left of the canvas; radius in CSS px. */
    paint(u0, v0, u1, v1, radiusCss, erase) {
      if (lost || !targets.length) return;
      const { p, u } = progs.paint;
      gl.useProgram(p);
      gl.viewport(0, 0, simW, simH);
      gl.activeTexture(gl.TEXTURE0);
      gl.uniform1i(u.uState, 0);
      gl.uniform2f(u.uP0, u0 * simW, (1 - v0) * simH);
      gl.uniform2f(u.uP1, u1 * simW, (1 - v1) * simH);
      gl.uniform1f(u.uRadius, Math.max(1.5, (radiusCss * simW) / cssW));
      gl.uniform1f(u.uErase, erase ? 1 : 0);
      const next = 1 - cur;
      gl.bindFramebuffer(gl.FRAMEBUFFER, targets[next].fb);
      gl.bindTexture(gl.TEXTURE_2D, targets[cur].tex);
      draw();
      cur = next;
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    },

    render(time) {
      if (lost || !targets.length || !palette) return;
      const { p, u } = progs.render;
      gl.useProgram(p);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, targets[cur].tex);
      gl.uniform1i(u.uState, 0);
      gl.uniform2f(u.uSim, simW, simH);
      gl.uniform2f(u.uRes, canvas.width, canvas.height);
      gl.uniform1f(u.uDark, palette.dark ? 1 : 0);
      gl.uniform3fv(u.uGround, palette.ground.slice(0, 3));
      gl.uniform3fv(u.uAccent, palette.accent.slice(0, 3));
      gl.uniform3fv(u.uDeep, palette.deep.slice(0, 3));
      draw();
    },

    /** Called by the page on webglcontextlost: every GL object is gone, so stop touching them. */
    markLost() {
      lost = true;
      targets = [];
    },

    destroy() {
      if (!lost) freeTargets(targets);
      targets = [];
    },
  };

  return engine;
}
