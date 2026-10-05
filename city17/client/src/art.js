// Pixel art 100 % généré en code (aucun asset Valve). Remplace par tes PNG quand tu veux.
import { TILE, FACTIONS } from "@city17/shared";

export const TILE_ORDER = ["#", ".", ",", "D", "=", "R", "N", "P", "~"];

const hex = (n) => "#" + n.toString(16).padStart(6, "0");
function rng(seed) { return () => ((seed = (seed * 16807) % 2147483647) / 2147483647); }

function px(ctx, x, y, c, w = 1, h = 1) { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); }

const TILE_PAINTERS = {
  "#": (c, r) => { // béton / brique
    px(c, 0, 0, "#3a3f44", 16, 16);
    for (let y = 0; y < 16; y += 4) {
      px(c, 0, y, "#2a2e32", 16, 1);
      const off = (y / 4) % 2 ? 4 : 0;
      for (let x = off; x < 16; x += 8) px(c, x, y, "#2a2e32", 1, 4);
    }
    for (let i = 0; i < 6; i++) px(c, r() * 16 | 0, r() * 16 | 0, "#4a5056");
  },
  ".": (c, r) => { // asphalte
    px(c, 0, 0, "#4b4f52", 16, 16);
    for (let i = 0; i < 14; i++) px(c, r() * 16 | 0, r() * 16 | 0, r() > .5 ? "#55595c" : "#424649");
  },
  ",": (c, r) => { // parquet
    px(c, 0, 0, "#5e4630", 16, 16);
    for (let y = 0; y < 16; y += 4) px(c, 0, y + 3, "#4a3624", 16, 1);
    for (let i = 0; i < 5; i++) px(c, r() * 16 | 0, r() * 16 | 0, "#6b5038");
  },
  "D": (c) => {
    px(c, 0, 0, "#3a3f44", 16, 16); px(c, 2, 1, "#4a3020", 12, 15);
    px(c, 3, 2, "#6b4a30", 10, 14); px(c, 11, 8, "#d8c070", 1, 2);
  },
  "=": (c) => { // champ de force
    px(c, 0, 0, "#1d2a33", 16, 16);
    for (let y = 1; y < 16; y += 3) px(c, 0, y, "#7fd4ff", 16, 1);
    px(c, 0, 0, "#9aa4ab", 2, 16); px(c, 14, 0, "#9aa4ab", 2, 16);
  },
  "R": (c) => { // distributeur de rations
    px(c, 0, 0, "#4b4f52", 16, 16); px(c, 1, 0, "#20262b", 14, 16);
    px(c, 2, 1, "#3c464e", 12, 14); px(c, 4, 3, "#7fd4ff", 8, 4);
    px(c, 5, 4, "#c8f0ff", 2, 1); px(c, 5, 10, "#0b0e10", 6, 3); px(c, 12, 10, "#ffcc33", 1, 1);
  },
  "N": (c) => { // sol métal Combine
    px(c, 0, 0, "#1f272e", 16, 16);
    for (let i = 0; i < 16; i += 8) { px(c, i, 0, "#2c3640", 1, 16); px(c, 0, i, "#2c3640", 16, 1); }
    px(c, 3, 3, "#36424d"); px(c, 11, 11, "#36424d");
  },
  "P": (c, r) => { // pavés
    px(c, 0, 0, "#5a5650", 16, 16);
    for (let y = 0; y < 16; y += 4) for (let x = (y / 4) % 2 ? 2 : 0; x < 16; x += 4) {
      px(c, x, y, "#6a655d", 3, 3); if (r() > .7) px(c, x + 1, y + 1, "#77716a");
    }
  },
  "~": (c, r) => {
    px(c, 0, 0, "#1d3a40", 16, 16);
    for (let i = 0; i < 4; i++) px(c, r() * 12 | 0, r() * 16 | 0, "#2e5a63", 4, 1);
  },
};

export function makeTileset(scene) {
  const tex = scene.textures.createCanvas("tiles", TILE * TILE_ORDER.length, TILE);
  const ctx = tex.getContext();
  TILE_ORDER.forEach((ch, i) => {
    ctx.save(); ctx.translate(i * TILE, 0);
    TILE_PAINTERS[ch](ctx, rng(1234 + i * 97));
    ctx.restore();
  });
  tex.refresh();
}

// --- Personnages -----------------------------------------------------------
// h cheveux/casque · s peau/masque · e yeux · b haut · a accent · p pantalon · k chaussures
const HEAD = {
  down: ["....hhhhhh....", "...hhhhhhhh...", "...hssssssh...", "...seessees...", "...ssssssss...", "....ssssss...."],
  up:   ["....hhhhhh....", "...hhhhhhhh...", "...hhhhhhhh...", "...hhhhhhhh...", "...shhhhhhs...", "....ssssss...."],
  side: ["....hhhhhh....", "...hhhhhhhh...", "...hhhsssss...", "...hhhssses...", "...hhssssss...", "....ssssss...."],
};
const BODY = {
  down: ["..bbbbbbbbbb..", ".bbbbaabbbbbb.", ".sbbbbbbbbbbs.", ".sbbbbbbbbbbs.", "...bbbbbbbb..."],
  up:   ["..bbbbbbbbbb..", ".bbbbbbbbbbbb.", ".sbbbbbbbbbbs.", ".sbbbbbbbbbbs.", "...bbbbbbbb..."],
  side: ["...bbbbbbbb...", "...bbbbbbaa...", "...bbbsbbbb...", "...bbbsbbbb...", "...bbbbbbbb..."],
};
const LEGS = [
  ["...pppppppp...", "...ppp..ppp...", "...ppp..ppp...", "...kkk..kkk..."],
  ["...pppppppp...", "..ppp....ppp..", "..ppp....ppp..", "..kkk.....kk.."],
];

function palette(fid) {
  const f = FACTIONS[fid];
  const masked = fid === "cp" || fid === "ota";
  return {
    h: hex(masked ? 0x1a1f24 : fid === "rebel" ? 0x3a2a1a : 0x2b2118),
    s: masked ? "#6c7680" : "#d9a77f",
    e: masked ? hex(f.accent) : "#1a1a1a",
    b: hex(f.color), a: hex(f.accent),
    p: masked ? "#1a1f24" : fid === "cwu" ? "#4a3a20" : "#2e3a46",
    k: "#151515",
  };
}

export const DIRS = ["down", "up", "side"];

export function makeCharacter(scene, fid) {
  const key = `char-${fid}`;
  if (scene.textures.exists(key)) return key;
  const W = 16, H = 16, frames = DIRS.length * 2;
  const tex = scene.textures.createCanvas(key, W * frames, H);
  const ctx = tex.getContext();
  const pal = palette(fid);
  DIRS.forEach((d, di) => [0, 1].forEach((fr) => {
    const rows = [...HEAD[d], ...BODY[d], ...LEGS[fr]];
    const ox = (di * 2 + fr) * W + 1, oy = 1;
    rows.forEach((row, y) => [...row].forEach((ch, x) => ch !== "." && px(ctx, ox + x, oy + y, pal[ch])));
  }));
  tex.refresh();
  for (let i = 0; i < frames; i++) tex.add(i, 0, i * W, 0, W, H);
  DIRS.forEach((d, di) => scene.anims.create({
    key: `${key}-${d}`, frames: [0, 1].map((f) => ({ key, frame: di * 2 + f })), frameRate: 6, repeat: -1,
  }));
  return key;
}
