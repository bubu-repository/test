/**
 * A living sky, drawn in one fragment shader: layered simplex fBm for cumulus shape and shading
 * (ridged noise for the billows, plain noise for the body, two colour octaves for light), on a
 * soft pastel blue with a faint lilac-pink horizon, so frosted glass reads beautifully on top.
 * The cursor parts the clouds; cloud cover follows Bekasi's real weather; at night the sky goes
 * ink-blue with stars.
 * GLSL ES 1.00, so it runs on WebGL1 and WebGL2.
 */

export const SKY_VERTEX = `
attribute vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
`;

export const SKY_FRAGMENT = `
precision highp float;

uniform vec2 uRes;
uniform float uTime;
uniform vec2 uMouse;     // 0..1, (-1,-1) when away
uniform float uCover;    // -0.3 clear … 0.45 overcast
uniform float uStorm;    // 0..1 darker, heavier clouds
uniform float uDark;     // 0 day, 1 night
uniform float uSeed;
uniform float uWarm;     // 0 midday … 1 dawn/dusk: a magenta-peach horizon

vec2 hash(vec2 p) {
  p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
  return -1.0 + 2.0 * fract(sin(p) * 43758.5453123);
}

float noise(vec2 p) {
  const float K1 = 0.366025404;
  const float K2 = 0.211324865;
  vec2 i = floor(p + (p.x + p.y) * K1);
  vec2 a = p - i + (i.x + i.y) * K2;
  vec2 o = (a.x > a.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec2 b = a - o + K2;
  vec2 c = a - 1.0 + 2.0 * K2;
  vec3 h = max(0.5 - vec3(dot(a, a), dot(b, b), dot(c, c)), 0.0);
  vec3 n = h * h * h * h * vec3(dot(a, hash(i)), dot(b, hash(i + o)), dot(c, hash(i + 1.0)));
  return dot(n, vec3(70.0));
}

const mat2 M = mat2(1.6, 1.2, -1.2, 1.6);

float fbm(vec2 n) {
  float total = 0.0;
  float amp = 0.1;
  for (int i = 0; i < 7; i++) {
    total += noise(n) * amp;
    n = M * n;
    amp *= 0.4;
  }
  return total;
}

float star(vec2 p) {
  vec2 g = floor(p);
  vec2 f = fract(p) - 0.5;
  vec2 h = hash(g);
  float on = step(0.86, fract(h.x * 13.17 + h.y * 7.3));
  float tw = 0.6 + 0.4 * sin(uTime * (1.0 + h.y * 2.0) + h.x * 6.28);
  return on * tw * smoothstep(0.08, 0.0, length(f - h * 0.35));
}

void main() {
  vec2 p = gl_FragCoord.xy / uRes;
  float aspect = uRes.x / uRes.y;
  vec2 base = p * vec2(aspect, 1.0) + vec2(uSeed, uSeed * 0.37);
  const float scale = 1.05;
  float t = uTime * 0.010;
  float q = fbm(base * scale * 0.5);

  // Ridged noise: the billowy shapes.
  float r = 0.0;
  vec2 uv = base * scale - (q - t);
  float w = 0.8;
  for (int i = 0; i < 8; i++) {
    r += abs(w * noise(uv));
    uv = M * uv + t;
    w *= 0.7;
  }

  // Plain noise: the cloud body.
  float f = 0.0;
  uv = base * scale - (q - t);
  w = 0.7;
  for (int i = 0; i < 8; i++) {
    f += w * noise(uv);
    uv = M * uv + t;
    w *= 0.6;
  }
  f *= r + f;

  // Two colour octaves: light and shade inside the clouds.
  float c = 0.0;
  float t2 = uTime * 0.020;
  uv = base * scale * 2.0 - (q - t2);
  w = 0.4;
  for (int i = 0; i < 7; i++) {
    c += w * noise(uv);
    uv = M * uv + t2;
    w *= 0.6;
  }
  float c1 = 0.0;
  float t3 = uTime * 0.030;
  uv = base * scale * 3.0 - (q - t3);
  w = 0.4;
  for (int i = 0; i < 7; i++) {
    c1 += abs(w * noise(uv));
    uv = M * uv + t3;
    w *= 0.6;
  }
  c += c1;

  // Sky gradient: soft blue up top, a pale lilac-pink haze near the horizon.
  vec3 dayTop = vec3(0.38, 0.63, 0.99);
  vec3 dayLow = vec3(0.90, 0.92, 1.00);
  vec3 nightTop = vec3(0.02, 0.03, 0.08);
  vec3 nightLow = vec3(0.13, 0.06, 0.21);
  float gy = pow(clamp(p.y, 0.0, 1.0), 0.85);
  vec3 dawnLow = vec3(1.0, 0.80, 0.88);
  vec3 dayLowWarm = mix(dayLow, dawnLow, uWarm * (1.0 - gy));
  vec3 sky = mix(mix(dayLowWarm, dayTop, gy), mix(nightLow, nightTop, gy), uDark);

  // Cloud colour: bright, slightly warm whites by day; moonlit lavender at night.
  vec3 cloudDay = vec3(1.24, 1.17, 1.12) * clamp(0.56 - 0.22 * uStorm + 0.30 * c, 0.0, 1.0);
  vec3 cloudNight = vec3(0.36, 0.34, 0.54) * clamp(0.5 + 0.3 * c, 0.0, 1.0);
  vec3 cloud = mix(cloudDay, cloudNight, uDark);

  // The cursor parts the clouds.
  float part = 0.0;
  if (uMouse.x >= 0.0) {
    float d = length((p - uMouse) * vec2(aspect, 1.0));
    part = smoothstep(0.26, 0.0, d) * 1.4;
  }

  float density = uCover + 7.0 * f * r - part;
  vec3 col = mix(sky, clamp(0.5 * sky + cloud, 0.0, 1.0), clamp(density + c - part * 0.5, 0.0, 1.0));

  // Stars at night, only where the sky is clear.
  if (uDark > 0.5) {
    float s = star(gl_FragCoord.xy / 3.0) * (1.0 - clamp(density + c, 0.0, 1.0));
    col += vec3(s);
  }

  // A touch of grain so the gradient never bands.
  float grain = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233)) + uTime) * 43758.5453) - 0.5;
  col += grain * 0.012;

  gl_FragColor = vec4(col, 1.0);
}
`;
