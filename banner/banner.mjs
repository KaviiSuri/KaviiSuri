// t-snap-final: the T snaps shut into a box, gets a FRONTEND? / BACKEND? / ML? label
// slapped on, strains (sides bulge, lid lifts), bursts, the tag rips off, back to the T.
// Three 3 s beats, one label each. Name + headline never leave.
// Usage: node t-snap-final.mjs <outdir> [dark|light]
import fs from 'node:fs';
import path from 'node:path';

const OUT = process.argv[2] || '/tmp/gifmock-t-snap/frames';
const THEME = process.argv[3] || 'dark';
fs.mkdirSync(OUT, { recursive: true });
for (const f of fs.readdirSync(OUT)) fs.unlinkSync(path.join(OUT, f));

const W = 1280, H = 320, FPS = 15, BEAT = 45;
const TAGS = [
  { text: 'FRONTEND?', rot: -6 },
  { text: 'BACKEND?', rot: 5 },
  { text: 'ML?', rot: -9 },
];
const N = BEAT * TAGS.length;
const LIGHT = THEME === 'light';
const BG = LIGHT ? '#ffffff' : '#17130f';
const DOT = LIGHT ? '#ece6dc' : '#2a231c';
const KRAFT_OUT = [184, 134, 75];
const KRAFT_IN = [214, 175, 118];
const ORANGE = [255, 106, 44];
const INK = '#2b1d10';
const NAME = LIGHT ? '#1f1710' : '#f4ead6';
const HEAD = LIGHT ? '#7a5228' : '#d9b27c';
const SHADOW = LIGHT ? 0.18 : 0.35;
const LABEL_FONT = "'DIN Condensed', 'Avenir Next Condensed', sans-serif";
const SANS = "'Helvetica Neue', Helvetica, sans-serif";
const TAG_FONT = "'Marker Felt', sans-serif";

// ---------- easing ----------
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, t) => a + (b - a) * t;
const seg = (f, a, b) => clamp((f - a) / (b - a));
const easeInOut = t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const easeIn = t => t * t * t;
const easeOut = t => 1 - Math.pow(1 - t, 3);
const easeOutBack = (t, s = 1.9) => 1 + (s + 1) * Math.pow(t - 1, 3) + s * Math.pow(t - 1, 2);
const easeOutBounce = t => {
  const n = 7.5625, d = 2.75;
  if (t < 1 / d) return n * t * t;
  if (t < 2 / d) return n * (t -= 1.5 / d) * t + 0.75;
  if (t < 2.5 / d) return n * (t -= 2.25 / d) * t + 0.9375;
  return n * (t -= 2.625 / d) * t + 0.984375;
};
const rad = d => d * Math.PI / 180;
const rgb = (c, k = 1) => `rgb(${c.map(v => Math.round(clamp(v * k, 0, 255))).join(',')})`;

// ---------- cube net (same as box-to-t) ----------
const faces = {
  B: { u: -0.5, v: -0.5, chain: [] },
  A: { u: -1.5, v: -0.5, chain: ['A'] },
  C: { u: 0.5, v: -0.5, chain: ['C'] },
  D: { u: -0.5, v: 0.5, chain: ['D'] },
  E: { u: -0.5, v: 1.5, chain: ['E', 'D'] },
  F: { u: -0.5, v: 2.5, chain: ['F', 'E', 'D'] },
};
const hinges = {
  A: { axis: 'x', at: -0.5, dir: -1 },
  C: { axis: 'x', at: 0.5, dir: 1 },
  D: { axis: 'z', at: 0.5, dir: 1 },
  E: { axis: 'z', at: 1.5, dir: 1 },
  F: { axis: 'z', at: 2.5, dir: 1 },
};
function rotHinge(p, h, th) {
  const [X, Y, Z] = p;
  const c = Math.cos(th), s = Math.sin(th);
  if (h.axis === 'z') {
    const d = (Z - h.at) * h.dir;
    const d2 = d * c - Y * s, Y2 = d * s + Y * c;
    return [X, Y2, h.at + d2 * h.dir];
  } else {
    const d = (X - h.at) * h.dir;
    const d2 = d * c - Y * s, Y2 = d * s + Y * c;
    return [h.at + d2 * h.dir, Y2, Z];
  }
}
function placeFace(name, ang, lift = 0) {
  const f = faces[name];
  const pts = [[f.u, 0, f.v], [f.u + 1, 0, f.v], [f.u, 0, f.v + 1], [f.u, 1e-3, f.v]];
  return pts.map(p => {
    let q = p;
    for (const k of f.chain) q = rotHinge(q, hinges[k], ang[k]);
    return [q[0], q[1] + lift, q[2]];
  });
}
function makeCam(cx, cy, S, phi, psi) {
  const cphi = Math.cos(phi), sphi = Math.sin(phi), cpsi = Math.cos(psi), spsi = Math.sin(psi);
  const proj = ([X, Y, Z]) => {
    const X1 = X * cpsi + Z * spsi;
    const Z1 = -X * spsi + Z * cpsi;
    return { x: cx + X1 * S, y: cy + (Z1 * sphi - Y * cphi) * S, d: Z1 * cphi + Y * sphi };
  };
  const V = [-spsi * cphi, sphi, cpsi * cphi];
  return { proj, V };
}
const Lt = (() => { const v = [-0.45, 0.8, 0.55]; const n = Math.hypot(...v); return v.map(x => x / n); })();
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const norm = a => { const n = Math.hypot(...a); return a.map(x => x / n); };
const fmt = n => n.toFixed(2);
const affine = (p00, p10, p01) =>
  `matrix(${fmt(p10.x - p00.x)} ${fmt(p10.y - p00.y)} ${fmt(p01.x - p00.x)} ${fmt(p01.y - p00.y)} ${fmt(p00.x)} ${fmt(p00.y)})`;

// camera poses
// camera poses
const T_VIEW = { S: 116, phi: 40, psi: 0, cx: 345, cy: 58 };
const BOX_VIEW = { S: 124, phi: 27, psi: 30, cx: 350, cy: 212 };
const camAt = (m, wob = 0) => makeCam(
  lerp(T_VIEW.cx, BOX_VIEW.cx, m), lerp(T_VIEW.cy, BOX_VIEW.cy, m), lerp(T_VIEW.S, BOX_VIEW.S, m),
  rad(lerp(T_VIEW.phi, BOX_VIEW.phi, m)), rad(lerp(T_VIEW.psi, BOX_VIEW.psi, m)) + wob);

// plain label sticker, same style as t-snap
const tagSvg = (tag, extraScale = 1) => `
  <g transform="rotate(${tag.rot}) scale(${fmt(extraScale)})">
    <rect x="-108" y="-38" width="224" height="92" rx="6" fill="#000" opacity="0.3"/>
    <rect x="-112" y="-46" width="224" height="92" rx="6" fill="#fbf6ea"/>
    <text x="0" y="15" font-family="${TAG_FONT}" font-size="44" fill="#1d1a16" text-anchor="middle">${tag.text}</text>
  </g>`;

// ---------- one beat (45 frames = 3 s) ----------
// 0-13 T held | 12-16 side cells slide in | 14-20 fold (quick) | 20 shut
// 20-23 label slapped on | 23-28 strain: sides bulge, lid lifts, light leaks
// 28 BURST: walls blow open, tag rips off | 28-36 back to T | 36-44 T held
// Closed box on screen frames 20-28 (9 of 45).
function frame(g) {
  const beat = Math.floor(g / BEAT), f = g % BEAT;
  const tag = TAGS[beat];
  const BURST = 28;
  const burst = f >= BURST;

  const foldC = {
    A: easeIn(seg(f, 14, 19)), C: easeIn(seg(f, 15, 20)), D: easeIn(seg(f, 14, 19)),
    F: easeIn(seg(f, 14, 18)), E: easeIn(seg(f, 15, 20)),
  };
  const openC = {
    A: 1 - easeOutBounce(seg(f, 28, 35)), C: 1 - easeOutBounce(seg(f, 29, 36)), D: 1 - easeOutBounce(seg(f, 28, 35)),
    E: 1 - easeOutBounce(seg(f, 28, 34)), F: 1 - easeOutBounce(seg(f, 29, 35)),
  };
  const C = burst ? openC : foldC;

  // strain: walls lean out, lid lifts, box inflates and shakes
  let wob = 0, lift = 0, strain = 0, pulse = 0;
  if (f >= 21 && f < BURST) {
    strain = easeIn(seg(f, 21, 27.5)) * 0.85 + 0.15;
    pulse = 0.55 + 0.45 * Math.abs(Math.sin(f * 1.7));
    wob = Math.sin(f * 2.6) * 0.045 * strain;
    lift = Math.abs(Math.sin(f * 1.9)) * 0.08 * strain;
  }
  if (f >= BURST && f < 35) lift = Math.sin(Math.PI * seg(f, BURST, 35)) * 0.28;
  const out = { A: 16, C: 16, D: 10, F: 0, E: 48 }; // degrees each face gives under strain
  const ang = {};
  for (const k of Object.keys(C)) ang[k] = rad(90 * C[k] - out[k] * strain * (k === 'E' ? 0.7 + 0.3 * pulse : pulse));

  const camM = burst ? 1 - easeOut(seg(f, BURST, 36)) : easeInOut(seg(f, 12, 20));
  const cam = camAt(camM, wob);
  const S = lerp(T_VIEW.S, BOX_VIEW.S, camM);
  const maxC = Math.max(...Object.values(C));
  const flat = (1 - maxC) * (1 - camM);

  const svg = [];
  svg.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`);
  svg.push(`<defs>
    <linearGradient id="deep" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${BG}" stop-opacity="0"/><stop offset="1" stop-color="${BG}" stop-opacity="1"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0" stop-color="${rgb(ORANGE)}" stop-opacity="${LIGHT ? 0.4 : 0.6}"/><stop offset="1" stop-color="${rgb(ORANGE)}" stop-opacity="0"/>
    </radialGradient>
  </defs>`);
  svg.push(`<rect width="${W}" height="${H}" fill="${BG}"/>`);
  svg.push(`<g fill="${DOT}">`);
  for (let x = 20; x < W; x += 40) for (let y = 20; y < H; y += 40) svg.push(`<circle cx="${x}" cy="${y}" r="1.6"/>`);
  svg.push(`</g>`);

  const boxCentre = camAt(1).proj([0, 0.5, 0]);
  // light leaking out while it strains
  if (strain > 0) {
    const r = 150 + 90 * strain * pulse;
    svg.push(`<ellipse cx="${fmt(boxCentre.x)}" cy="${fmt(boxCentre.y - 30)}" rx="${fmt(r)}" ry="${fmt(r * 0.6)}" fill="url(#glow)" opacity="${fmt(0.9 * strain)}"/>`);
  }
  if (f >= BURST && f < 36) {
    const t = seg(f, BURST, 36);
    const r = lerp(140, 440, easeOut(t));
    svg.push(`<ellipse cx="${fmt(boxCentre.x)}" cy="${fmt(boxCentre.y)}" rx="${fmt(r)}" ry="${fmt(r * 0.6)}" fill="url(#glow)" opacity="${fmt(1 - t)}"/>`);
  }

  // shadow
  if (flat < 0.99) {
    const c = cam.proj([0, 0, 0]);
    svg.push(`<ellipse cx="${fmt(c.x + 10)}" cy="${fmt(c.y + 14)}" rx="${fmt(S * 1.05 * (1 + 0.08 * strain))}" ry="${fmt(S * 0.42)}" fill="#000" opacity="${fmt(SHADOW * (1 - flat) / (1 + lift * 3))}"/>`);
  }

  // ---- outer cells + stem tail (slide under, shoot back out) ----
  const e = burst ? easeOutBack(seg(f, 30, 37), 2.2) : 1 - easeIn(seg(f, 11, 15));
  const drawCell = (u, v, col, label, la) => {
    const p00 = cam.proj([u, 0, v]), p10 = cam.proj([u + 1, 0, v]), p01 = cam.proj([u, 0, v + 1]);
    const p11 = { x: p10.x + p01.x - p00.x, y: p10.y + p01.y - p00.y };
    const pts = [p00, p10, p11, p01];
    svg.push(`<polygon points="${pts.map(p => `${fmt(p.x + 5)},${fmt(p.y + 7)}`).join(' ')}" fill="#000" opacity="${SHADOW}"/>`);
    svg.push(`<polygon points="${pts.map(p => `${fmt(p.x)},${fmt(p.y)}`).join(' ')}" fill="${rgb(col)}" stroke="${BG}" stroke-width="2.5"/>`);
    if (label && la > 0) {
      const mx = (p00.x + p11.x) / 2, my = (p00.y + p11.y) / 2;
      svg.push(`<text x="${fmt(mx)}" y="${fmt(my + 11)}" font-family="${LABEL_FONT}" font-weight="bold" font-size="29" letter-spacing="1" fill="${INK}" text-anchor="middle" opacity="${fmt(la)}">${label}</text>`);
    }
  };
  if (e > 0.001 && (burst ? f >= 30 : true)) {
    const la = clamp((e - 0.5) / 0.5) * clamp((flat - 0.5) / 0.5);
    drawCell(lerp(-0.5, -0.5, e), lerp(2.5, 3.5, e), ORANGE.map(v => v * 0.62), '', 0);
    drawCell(lerp(-1.5, -2.5, e), -0.5, KRAFT_IN, 'FRONTEND', la);
    drawCell(lerp(0.5, 1.5, e), -0.5, KRAFT_IN, 'INFRA', la);
  }

  // ---- cube faces (inflate about the box centre while straining) ----
  const list = Object.keys(faces).map(name => {
    const P = placeFace(name, ang, lift);
    const pr = P.map(cam.proj);
    const n = norm(sub(P[3], P[0]));
    const centre = [(P[1][0] + P[2][0]) / 2, (P[1][1] + P[2][1]) / 2, (P[1][2] + P[2][2]) / 2];
    return { name, P, pr, n, d: cam.proj(centre).d };
  });
  list.sort((a, b) => a.d - b.d);
  const bc = cam.proj([0, 0.5 + lift, 0]);
  const sx = 1 + 0.12 * strain * pulse, sy = 1 - 0.05 * strain * pulse;
  svg.push(`<g transform="translate(${fmt(bc.x)} ${fmt(bc.y)}) scale(${fmt(sx)} ${fmt(sy)}) translate(${fmt(-bc.x)} ${fmt(-bc.y)})">`);
  const stemCol = { D: ORANGE, E: ORANGE.map(v => v * 0.86), F: ORANGE.map(v => v * 0.74) };
  const labels = { A: 'BACKEND', B: 'DATA', C: 'ML', D: 'AI MEDIA' };
  const labelA = clamp((flat - 0.55) / 0.45);
  for (const fc of list) {
    const [p00, p10, p01] = fc.pr;
    const p11 = { x: p10.x + p01.x - p00.x, y: p10.y + p01.y - p00.y };
    const insideVisible = dot(fc.n, cam.V) > 0;
    const nn = insideVisible ? fc.n : fc.n.map(x => -x);
    const light = 0.62 + 0.42 * Math.max(0, dot(nn, Lt));
    const base = insideVisible ? (stemCol[fc.name] || KRAFT_IN) : KRAFT_OUT;
    const pts = [p00, p10, p11, p01];
    if (flat > 0) svg.push(`<polygon points="${pts.map(p => `${fmt(p.x + 5)},${fmt(p.y + 7)}`).join(' ')}" fill="#000" opacity="${fmt(SHADOW * flat)}"/>`);
    svg.push(`<polygon points="${pts.map(p => `${fmt(p.x)},${fmt(p.y)}`).join(' ')}" fill="${rgb(base, lerp(light, 1, flat))}" stroke="${BG}" stroke-width="2.5" stroke-linejoin="round"/>`);
    if (!insideVisible) {
      if (fc.name === 'E') svg.push(`<g transform="${affine(p00, p10, p01)}"><rect x="0.38" y="0" width="0.24" height="1" fill="#e3c48f" opacity="0.85"/></g>`);
    } else if (labels[fc.name] && labelA > 0) {
      const mx = (p00.x + p11.x) / 2, my = (p00.y + p11.y) / 2;
      svg.push(`<text x="${fmt(mx)}" y="${fmt(my + 11)}" font-family="${LABEL_FONT}" font-weight="bold" font-size="29" letter-spacing="1" fill="${fc.name === 'D' ? '#1b0f07' : INK}" text-anchor="middle" opacity="${fmt(labelA)}">${labels[fc.name]}</text>`);
    }
  }
  // label slapped on the front
  const slapT = f >= 20 && f < BURST ? easeOutBack(seg(f, 20, 23), 2.4) : 0;
  if (slapT > 0) {
    const D = list.find(x => x.name === 'D').pr;
    const c = { x: (D[1].x + D[2].x) / 2, y: (D[1].y + D[2].y) / 2 };
    svg.push(`<g transform="translate(${fmt(c.x)} ${fmt(c.y + 18)}) scale(${fmt(0.82 * lerp(2.0, 1, slapT) / sx)} ${fmt(0.82 * lerp(2.0, 1, slapT) / sy)})">${tagSvg(tag)}</g>`);
  }
  svg.push(`</g>`);

  // slap impact lines
  if (f >= 20 && f < 24) {
    const t = seg(f, 20, 24);
    const c = boxCentre;
    svg.push(`<g stroke="${LIGHT ? INK : NAME}" stroke-width="4" stroke-linecap="round" opacity="${fmt(1 - t)}">`);
    for (const a of [-160, -140, -25, 15, 165]) {
      const r1 = 165 + 25 * t, r2 = r1 + 24;
      svg.push(`<line x1="${fmt(c.x + Math.cos(rad(a)) * r1)}" y1="${fmt(c.y + 20 + Math.sin(rad(a)) * r1 * 0.6)}" x2="${fmt(c.x + Math.cos(rad(a)) * r2)}" y2="${fmt(c.y + 20 + Math.sin(rad(a)) * r2 * 0.6)}"/>`);
    }
    svg.push(`</g>`);
  }

  // burst sparks
  if (f >= BURST && f < 34) {
    const t = easeOut(seg(f, BURST, 34));
    svg.push(`<g stroke="${rgb(ORANGE)}" stroke-width="5" stroke-linecap="round" opacity="${fmt(1 - seg(f, 30, 34))}">`);
    for (let i = 0; i < 10; i++) {
      const a = rad(i * 36 + 12);
      const r1 = lerp(60, 230, t), r2 = r1 + lerp(40, 10, t);
      svg.push(`<line x1="${fmt(boxCentre.x + Math.cos(a) * r1)}" y1="${fmt(boxCentre.y + Math.sin(a) * r1 * 0.6)}" x2="${fmt(boxCentre.x + Math.cos(a) * r2)}" y2="${fmt(boxCentre.y + Math.sin(a) * r2 * 0.6)}"/>`);
    }
    svg.push(`</g>`);
  }

  // tag ripped off, flung up and out of frame
  if (f >= BURST && f < 37) {
    const P = placeFace('D', { A: 0, C: 0, D: rad(90), E: rad(90), F: rad(90) }, 0).map(camAt(1).proj);
    const c0 = { x: (P[1].x + P[2].x) / 2, y: (P[1].y + P[2].y) / 2 };
    const t = (f - BURST) / FPS;
    const spin = beat % 2 ? -1 : 1;
    const x = c0.x - 380 * t, y = c0.y - 1150 * t + 700 * t * t;
    svg.push(`<g transform="translate(${fmt(x)} ${fmt(y)}) rotate(${fmt(tag.rot + spin * 480 * t)}) scale(0.8)">${tagSvg({ ...tag, rot: 0 })}</g>`);
  }

  // stem depth ticks, running off the bottom edge
  if (flat > 0.05) {
    const sc = cam.proj([0.5, 0, 0.5]); // right edge of stem, top of AI MEDIA
    svg.push(`<g stroke="${rgb(ORANGE)}" stroke-width="2.5" stroke-linecap="round" opacity="${fmt(clamp((flat - 0.6) / 0.4))}">`);
    for (let i = 0, y = sc.y + 6; y < H + 10; i++, y += 15) {
      const big = i % 5 === 0;
      svg.push(`<line x1="${fmt(sc.x + 10)}" y1="${fmt(y)}" x2="${fmt(sc.x + (big ? 30 : 20))}" y2="${fmt(y)}" opacity="${fmt(clamp(1 - (y - 140) / 220, 0.15, 1))}"/>`);
    }
    svg.push(`</g>`);
  }
  svg.push(`<rect x="0" y="262" width="700" height="58" fill="url(#deep)" opacity="${fmt(flat)}"/>`);

  // name + headline: always on screen
  const kick = f >= BURST && f < 36 ? Math.sin(Math.PI * seg(f, BURST, 36)) : 0;
  svg.push(`<g>
    <text x="700" y="128" font-family="${SANS}" font-weight="bold" font-size="82" letter-spacing="-1.5" fill="${NAME}">Kavii Suri</text>
    <rect x="703" y="150" width="${fmt(90 + 60 * kick)}" height="6" fill="${rgb(ORANGE)}"/>
    <g font-family="${SANS}" font-size="40" fill="${HEAD}">
      <text x="702" y="210">the engineer you throw</text>
      <text x="702" y="258">at a business problem</text></g></g>`);

  svg.push(`</svg>`);
  return svg.join('\n');
}

for (let g = 0; g < N; g++) fs.writeFileSync(path.join(OUT, `f${String(g).padStart(4, '0')}.svg`), frame(g));
console.log(`wrote ${N} frames (${(N / FPS).toFixed(2)} s, ${THEME}) to ${OUT}`);
