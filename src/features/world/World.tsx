"use client";

import { useEffect, useRef } from "react";

/**
 * The world behind every page, in the blues of Frutiger Aero, drawn by a single WebGL1 fragment
 * shader on a fixed canvas: the sky at the top of each page, the clear sky-white page (--bg) in the
 * middle, and the sea at the bottom. There are no hard edges between them: the sky thickens into a
 * bank of cloud that dissolves into the white, and the white thins into a pale horizon haze over
 * the water just above the footer, which sits in the deep sea.
 *
 * The layout drives it through markers, measured as the page scrolls:
 * - `[data-sky-end]`: where the sky has gone pale and the clouds take over (the top edge of the
 *   highest-priority visible marker). Under it the clouds turn to white over FADE screen heights.
 * - `[data-sky-text]`: words in the sky. The sky stays at least as deep as --sky-mid behind them
 *   (white text 4.9:1), and clouds keep out of their way.
 * - `[data-waterline]`: the sea's surface, the top edge of the highest-priority visible marker.
 *   The layout puts one above the footer (the shore); the guestbook puts its own under the header.
 * - `footer`: the water deepens to the deep sea as the footer comes in, for its white text.
 * Everything between the clouds and the haze is the page colour, so text there uses the page tokens.
 *
 * The sun follows the pointer, the water lights up under it, a press in open water lets out bubbles,
 * and caustics and motes drift with the scroll. While only the white page is on screen nothing is
 * drawn at all. It pauses in background tabs, runs at 30 fps and lower resolution on touch and
 * low-power devices, and draws only when something changes for reduced motion. Without WebGL the
 * gradients on <html> and the shore stay.
 */

const BUBBLES = 6;
/** Screen heights over which the clouds under the sky dissolve into the white page. */
const FADE = 0.42;
/** Screen heights of haze between the white page and the sea's surface. */
const HAZE = 0.24;

const VERTEX = `attribute vec2 aPos;varying vec2 vUv;void main(){vUv=vec2(aPos.x*.5+.5,.5-aPos.y*.5);gl_Position=vec4(aPos,0.,1.);}`;

const FRAGMENT = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform vec2 uRes;
uniform float uTime;
uniform float uHorizon;
uniform float uSky;
uniform vec4 uText;
uniform vec2 uDeep;
uniform float uScrollY;
uniform vec2 uPointer;
uniform float uPointerOn;
uniform vec4 uBubbles[${BUBBLES}];
varying vec2 vUv;

float hash(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
  return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.,1.)),f.x),f.y);}
float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<5;i++){v+=a*noise(p);p=p*2.03+vec2(17.1,9.2);a*=.5;}return v;}

// Tileable water caustics (after Dave Hoskins).
float caustic(vec2 uv,float time){
  vec2 p=mod(uv*6.28318,6.28318)-250.;vec2 i=p;float c=1.;float inten=.005;
  for(int n=0;n<4;n++){float t=time*(1.-(3.5/float(n+1)));
    i=p+vec2(cos(t-i.x)+sin(t+i.y),sin(t-i.y)+cos(t+i.x));
    c+=1./length(vec2(p.x/(sin(i.x+t)/inten),p.y/(cos(i.y+t)/inten)));}
  c/=4.;c=1.17-pow(c,1.4);return pow(abs(c),8.);
}

const vec3 SKY_TOP=vec3(.039,.345,.745);   // #0A58BE
const vec3 SKY_MID=vec3(.082,.439,.839);   // #1570D6
const vec3 SKY_LOW=vec3(.310,.690,.949);   // #4FB0F2
const vec3 HORIZON=vec3(.812,.949,1.);     // #CFF2FF
const vec3 PAGE=vec3(.957,.976,.992);      // #F4F9FD, --bg
const float FADE=${FADE.toFixed(2)};
const float HAZE=${HAZE.toFixed(2)};

vec3 seaColor(float d){
  vec3 c=mix(vec3(.498,.890,.969),vec3(.235,.784,.941),smoothstep(0.,.03,d)); // #7FE3F7 -> #3CC8F0
  c=mix(c,vec3(.055,.561,.847),smoothstep(.03,.28,d));  // #0E8FD8
  c=mix(c,vec3(.039,.337,.690),smoothstep(.28,.75,d));  // #0A56B0
  c=mix(c,vec3(.027,.231,.525),smoothstep(.75,1.4,d));  // #073B86
  return mix(c,vec3(.020,.169,.400),smoothstep(1.4,2.4,d)); // #052B66
}

void main(){
  vec2 uv=vUv;
  float aspect=uRes.x/uRes.y;
  vec2 q=vec2(uv.x*aspect,uv.y);
  float t=uTime;
  float wl=uHorizon;
  float wy=wl+.0045*sin(q.x*9.+t*1.1)+.0025*sin(q.x*23.-t*1.7)+.0012*sin(q.x*51.+t*2.3);
  vec3 col;

  float paper=0.;
  if(uv.y<wy){
    // The sky: deep azure down to the bottom of the words, then paler towards the sky's end, where a
    // bank of cloud thickens and dissolves into the white page. A page with no sky is all white here.
    float S=min(uSky,wl-.02);
    float tb=min(max(uText.w,-1.),S-.01);
    col=mix(SKY_TOP,SKY_MID,smoothstep(0.,max(tb,.001),uv.y));
    float f=clamp((uv.y-tb)/max(S-tb,.001),0.,1.);
    float below=smoothstep(tb-.005,tb+.02,uv.y);
    col=mix(col,SKY_LOW,smoothstep(.0,.55,f)*below);
    col=mix(col,HORIZON,smoothstep(.45,1.,f)*below);
    float g=clamp((uv.y-S)/FADE,0.,1.);
    col=mix(col,mix(HORIZON,PAGE,smoothstep(.15,.8,g)),step(S,uv.y));
    // The sun, top right, sinking with the sky as it scrolls away; a soft halo and three faint flare ghosts.
    if(S>0.){
      vec2 sun=vec2(aspect*.86,min(.11,S*.2))+(uPointer-.5)*vec2(.06,.035)*uPointerOn;
      float ds=length(q-sun);
      col+=vec3(1.,.97,.86)*(.95*exp(-ds*ds*1100.)+.2*exp(-ds*8.))*(1.-g);
      vec2 axis=vec2(aspect*.45,S*.55)-sun;
      for(int i=1;i<=3;i++){float k=float(i)*.5;float r=.01+.012*float(i);
        col+=vec3(.75,.92,1.)*.022*smoothstep(r,r*.55,length(q-(sun+axis*k)))*(1.-g);}
    }
    // Clouds: sparse above the sky's end, closing into a bank under it, lit from above; on wide
    // screens a few to the side of the words.
    vec2 cp=vec2(q.x*1.5+t*.012,(q.y-S)*3.4)*2.2;
    float n=fbm(cp);
    float lit=clamp((n-fbm(cp+vec2(.0,.22)))*5.,-1.,1.);
    float cov=smoothstep(S-.2,S+FADE*.8,uv.y);
    float bank=smoothstep(.62-.66*cov,.8-.6*cov,n)*smoothstep(S-.24,S-.1,uv.y)*below;
    float side=aspect>1.2?max(smoothstep(uText.z+.04,uText.z+.16,uv.x),1.-smoothstep(uText.x-.16,uText.x-.04,uv.x))*smoothstep(.05,.3,uv.y/max(S,.001))*step(uv.y,S):0.;
    float cloud=clamp(bank+smoothstep(.52,.78,n)*side*.8,0.,1.);
    vec3 cloudCol=mix(vec3(.80,.89,.98),vec3(1.),.6+.4*lit);
    col=mix(col,mix(cloudCol,PAGE,smoothstep(.3,1.,g)),cloud*.94);
    // Past the clouds, the page: exactly --bg, so the white between sky and sea has no seam.
    paper=smoothstep(.55,1.,g)*step(S,uv.y);
    col=mix(col,PAGE,paper);
    // Above the sea, the white thins into a pale horizon haze, with a bright line at the surface.
    float h=smoothstep(wl-HAZE,wl,uv.y);
    col=mix(col,mix(PAGE,HORIZON,.85),h*h);
    col+=vec3(1.)*.12*exp(-(wy-uv.y)*140.)*step(wl-HAZE,uv.y);
    paper=max(paper,h);
  } else {
    // The sea: bright lagoon water under the surface, deepening as the footer comes in.
    float d=uv.y-wy;
    float D=clamp((uv.y-wl)*.09,0.,.13)+smoothstep(uDeep.x,uDeep.y,uv.y)*1.6;
    col=seaColor(D);
    col+=vec3(.85,.98,1.)*.35*exp(-d*55.)*(.65+.35*sin(q.x*70.+t*2.4));
    vec2 w=q+vec2(0.,uScrollY*.85);
    col+=vec3(.75,.95,1.)*caustic(w*1.5+vec2(0.,t*.02),t*.45)*.3*exp(-D*2.4);
    float x=q.x+D*.35;
    float rays=pow(.5+.5*sin(x*11.+sin(x*3.1+t*.25)*1.7+t*.15),5.)+.6*pow(.5+.5*sin(x*19.-t*.22+1.3),8.);
    col+=vec3(.7,.92,1.)*rays*.12*exp(-D*1.5)*smoothstep(0.,.06,d);
    vec2 g=(q+vec2(0.,uScrollY*.7))*38.+vec2(0.,-t*.25);vec2 cell=floor(g);vec2 fr=fract(g)-.5;
    vec2 off=vec2(hash(cell+3.1),hash(cell+7.7))-.5;
    col+=vec3(.8,.95,1.)*smoothstep(.08,0.,length(fr-off*.7))*step(.82,hash(cell))*.18*exp(-D*.8);
    vec2 pq=vec2(uPointer.x*aspect,uPointer.y);
    float dp=length(q-pq);
    col+=vec3(.55,.85,1.)*.1*exp(-dp*dp*28.)*uPointerOn*step(wl,uPointer.y);
    for(int i=0;i<${BUBBLES};i++){
      vec4 b=uBubbles[i];
      float age=t-b.z;
      if(b.w<.2||age<0.||age>7.)continue;
      vec2 o=vec2(b.x*aspect,b.y);
      col+=vec3(.8,.96,1.)*exp(-pow((length(q-o)-age*.35)*70.,2.))*max(0.,1.-age/1.3)*.35*b.w;
      for(int k=0;k<7;k++){
        float fk=float(k);
        float a2=age-fk*.07;
        if(a2<0.)continue;
        float by=o.y-a2*(.05+.03*hash(vec2(fk,b.z)))-a2*a2*.006;
        if(by<wl+.006)continue;
        float bx=o.x+(hash(vec2(b.z,fk))-.5)*.08+sin(a2*2.6+fk)*.01;
        float br=.004+.007*hash(vec2(fk*1.7,b.z));
        float db=length(q-vec2(bx,by));
        float rim=smoothstep(br,br*.72,db)-.7*smoothstep(br*.72,br*.4,db);
        float hi=smoothstep(br*.35,0.,length(q-vec2(bx-br*.35,by-br*.35)));
        col+=vec3(.9,.98,1.)*(rim*.55+hi*.6);
      }
    }
  }
  // Mist over the surface, so the white page goes into the sea through soft wisps, not along a ruled line.
  float mz=uv.y-wl;
  float mist=fbm(vec2(q.x*1.7-t*.015,mz*7.)*2.);
  col=mix(col,vec3(.93,.98,1.),smoothstep(.4,.72,mist)*exp(-mz*mz*420.)*.8);
  vec2 vc=uv-.5;
  col*=1.-.24*dot(vc,vc)*(1.-paper);
  col+=(hash(gl_FragCoord.xy+fract(t))-.5)/255.;
  gl_FragColor=vec4(col,1.);
}`;

function compile(gl: WebGLRenderingContext, type: number, source: string): WebGLShader | null {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    if (process.env.NODE_ENV !== "production") console.warn("World shader:", gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

/** Presses on these never make bubbles: controls, and the glass objects floating in the water. */
const NO_SPLASH = "a, button, input, textarea, select, label, summary, [role='button'], [role='dialog'], .widget, .glass, .glass-strong, [data-no-splash]";

type Markers = { waterline: Element | null; sky: Element | null; text: Element | null; footer: Element | null };

function visible(el: Element): boolean {
  const r = el.getBoundingClientRect();
  return r.width > 0 || r.height > 0;
}

/** The visible marker with the highest priority (the attribute's value). */
function strongest(attribute: string): Element | null {
  let found: Element | null = null;
  let best = -Infinity;
  for (const el of document.querySelectorAll(`[${attribute}]`)) {
    const priority = Number(el.getAttribute(attribute)) || 0;
    if (priority > best && visible(el)) {
      best = priority;
      found = el;
    }
  }
  return found;
}

function findMarkers(): Markers {
  const text = Array.from(document.querySelectorAll("[data-sky-text]")).find(visible) ?? null;
  return { waterline: strongest("data-waterline"), sky: strongest("data-sky-end"), text, footer: document.querySelector("body > footer, #contact") };
}

export function World() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl = canvas.getContext("webgl", { antialias: false, alpha: false, depth: false, stencil: false, powerPreference: "low-power", preserveDrawingBuffer: false });
    if (!gl) return;
    const vs = compile(gl, gl.VERTEX_SHADER, VERTEX);
    const fs = compile(gl, gl.FRAGMENT_SHADER, FRAGMENT);
    if (!vs || !fs) return;
    const program = gl.createProgram();
    if (!program) return;
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return;
    gl.useProgram(program);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
    const aPos = gl.getAttribLocation(program, "aPos");
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    const u = {
      res: gl.getUniformLocation(program, "uRes"),
      time: gl.getUniformLocation(program, "uTime"),
      horizon: gl.getUniformLocation(program, "uHorizon"),
      sky: gl.getUniformLocation(program, "uSky"),
      text: gl.getUniformLocation(program, "uText"),
      deep: gl.getUniformLocation(program, "uDeep"),
      scrollY: gl.getUniformLocation(program, "uScrollY"),
      pointer: gl.getUniformLocation(program, "uPointer"),
      pointerOn: gl.getUniformLocation(program, "uPointerOn"),
      bubbles: gl.getUniformLocation(program, "uBubbles"),
    };

    const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const coarse = window.matchMedia("(pointer: coarse)").matches;
    const nav = navigator as Navigator & { deviceMemory?: number };
    const lowPower = coarse || (nav.hardwareConcurrency ?? 8) <= 4 || (nav.deviceMemory ?? 8) <= 4;
    const frameGap = lowPower ? 33 : 0;
    const start = performance.now();
    const now = () => (calm ? 12 : (performance.now() - start) / 1000);

    const bubbles = new Float32Array(BUBBLES * 4);
    let nextBubble = 0;
    let lastAuto = 0;
    const pointer = { x: 0.5, y: 0.3, tx: 0.5, ty: 0.3, on: 0, target: 0 };
    let markers = findMarkers();
    let markersAt = 0;
    let whiteDrawn = false;
    let wl = 9;

    const resize = () => {
      const scale = Math.min(window.devicePixelRatio || 1, 2) * (lowPower ? 0.4 : 0.55);
      const rect = canvas.getBoundingClientRect();
      const w = Math.max(1, Math.round(rect.width * scale));
      const h = Math.max(1, Math.round(rect.height * scale));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
        gl.viewport(0, 0, w, h);
        whiteDrawn = false;
      }
    };

    const spawn = (x: number, y: number, strength = 1) => {
      bubbles.set([x, y, now(), strength], (nextBubble++ % BUBBLES) * 4);
    };

    let drawn = false;
    const draw = () => {
      const t = now();
      const ms = performance.now();
      if (ms - markersAt > 400) {
        markers = findMarkers();
        markersAt = ms;
      }
      const rect = canvas.getBoundingClientRect();
      const H = Math.max(rect.height, 1);
      const W = Math.max(rect.width, 1);
      // The waterline and the sky's end, or far off screen when a page has none.
      wl = markers.waterline ? (markers.waterline.getBoundingClientRect().top - rect.top) / H : 9;
      const sky = markers.sky ? (markers.sky.getBoundingClientRect().top - rect.top) / H : -9;
      let text = [0, 0, 0, 0];
      if (markers.text) {
        const r = markers.text.getBoundingClientRect();
        text = [(r.left - rect.left) / W, (r.top - rect.top) / H, (r.right - rect.left) / W, (r.bottom - rect.top) / H];
      }
      const footerTop = markers.footer ? (markers.footer.getBoundingClientRect().top - rect.top) / H : 99;

      // Only the white page on screen: it's already drawn, so draw nothing until the sky or sea is back.
      const white = sky + FADE < 0 && wl - HAZE > 1.02;
      if (white && whiteDrawn) return;
      whiteDrawn = white;

      pointer.x += (pointer.tx - pointer.x) * 0.08;
      pointer.y += (pointer.ty - pointer.y) * 0.08;
      pointer.on += (pointer.target - pointer.on) * 0.06;
      if (!calm && t - lastAuto > 6.5) {
        lastAuto = t;
        const top = Math.max(wl + 0.2, 0.55);
        if (top < 0.95) spawn(0.05 + Math.random() * 0.9, 0.97, 0.5);
      }

      gl.uniform2f(u.res, canvas.width, canvas.height);
      gl.uniform1f(u.time, t);
      gl.uniform1f(u.horizon, wl);
      gl.uniform1f(u.sky, sky);
      gl.uniform4f(u.text, text[0], text[1], text[2], text[3]);
      gl.uniform2f(u.deep, footerTop - 0.15, footerTop + 0.7);
      gl.uniform1f(u.scrollY, window.scrollY / H);
      gl.uniform2f(u.pointer, pointer.x, pointer.y);
      gl.uniform1f(u.pointerOn, pointer.on);
      gl.uniform4fv(u.bubbles, bubbles);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      if (!drawn) {
        drawn = true;
        canvas.dataset.ready = "true";
      }
    };

    resize();
    const ro = new ResizeObserver(() => {
      resize();
      if (calm) draw();
    });
    ro.observe(canvas);

    let raf = 0;
    let last = 0;
    const frame = (ms: number) => {
      raf = requestAnimationFrame(frame);
      if (document.hidden) return;
      if (frameGap && ms - last < frameGap) return;
      last = ms;
      draw();
    };
    // Reduced motion: no animation, but the scene still follows the page as it scrolls.
    let pending = 0;
    const redraw = () => {
      if (pending) return;
      pending = requestAnimationFrame(() => {
        pending = 0;
        draw();
      });
    };
    if (calm) {
      draw();
      window.addEventListener("scroll", redraw, { passive: true });
    } else {
      raf = requestAnimationFrame(frame);
    }

    const onMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      pointer.tx = (e.clientX - rect.left) / rect.width;
      pointer.ty = (e.clientY - rect.top) / rect.height;
      pointer.target = e.pointerType === "mouse" ? 1 : 0;
      // Holographic stickers and foil read the pointer too.
      document.documentElement.style.setProperty("--mx", pointer.tx.toFixed(3));
      document.documentElement.style.setProperty("--my", pointer.ty.toFixed(3));
    };
    const onLeave = () => {
      pointer.target = 0;
    };
    const onDown = (e: PointerEvent) => {
      if (calm) return;
      if (e.target instanceof Element && e.target.closest(NO_SPLASH)) return;
      const rect = canvas.getBoundingClientRect();
      const y = (e.clientY - rect.top) / rect.height;
      if (y > wl + 0.01) spawn((e.clientX - rect.left) / rect.width, y);
    };
    // Other parts of the site can ask for a splash (the guestbook does when a creature goes in).
    const onBubbles = (e: Event) => {
      const d = (e as CustomEvent<{ x: number; y: number }>).detail;
      if (calm || !d) return;
      const rect = canvas.getBoundingClientRect();
      spawn((d.x - rect.left) / rect.width, (d.y - rect.top) / rect.height);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave);
    window.addEventListener("pointerdown", onDown, { passive: true });
    window.addEventListener("world:bubbles", onBubbles);

    const onLost = (e: Event) => {
      e.preventDefault();
      cancelAnimationFrame(raf);
      delete canvas.dataset.ready;
    };
    canvas.addEventListener("webglcontextlost", onLost);

    return () => {
      cancelAnimationFrame(raf);
      cancelAnimationFrame(pending);
      ro.disconnect();
      window.removeEventListener("scroll", redraw);
      window.removeEventListener("pointermove", onMove);
      document.documentElement.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("world:bubbles", onBubbles);
      canvas.removeEventListener("webglcontextlost", onLost);
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
    };
  }, []);

  return <canvas ref={canvasRef} className="world" aria-hidden="true" />;
}
