import Phaser from "phaser";
import {
  MAP_ASCII, TILE, MAP_W, MAP_H, FACTIONS, PLAYER_SPEED, RATION_COOLDOWN_MS, CHAT_RANGE,
  collides, findTiles,
} from "./shared.js";
import { makeTileset, makeCharacter, TILE_ORDER } from "./art.js";
import { initChat, pushChat, isTyping } from "./ui.js";
import { connect } from "./net.js";

const DISPENSERS = findTiles("R").map((t) => ({ x: t.x * TILE + 8, y: t.y * TILE + 8 }));
const ALERTS = ["", "Infection anticitoyenne détectée", "Code : mise sous contrôle", "Jugement immédiat"];
const $ = (id) => document.getElementById(id);
const rand = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const clean = (s, n) => String(s ?? "").slice(0, n);
const store = {
  get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
};

let net, me, alertText = "";
const peers = new Map(); // peerId -> { name, faction, cid, x, y, dir, moving }

// ---------- Réseau ----------
function pack() { return { n: me.name, f: me.faction, c: me.cid, x: Math.round(me.x), y: Math.round(me.y), d: me.dir, m: me.moving }; }

function setupNet() {
  net = connect();
  net.room.onPeerJoin = (id) => { net.state.send(pack(), { target: id }); if (alertText) net.alert.send(alertText, { target: id }); };
  net.room.onPeerLeave = (id) => {
    const p = peers.get(id);
    if (p) pushChat({ kind: "ooc", text: `${p.name} a quitté la ville.` });
    peers.delete(id);
  };
  net.state.onMessage = (s, { peerId }) => {
    if (!s || !FACTIONS[s.f]) return;
    const known = peers.get(peerId);
    const p = known || {};
    Object.assign(p, { name: clean(s.n, 24) || "Inconnu", faction: s.f, cid: clean(s.c, 32), x: +s.x || 0, y: +s.y || 0, dir: clean(s.d, 5), moving: !!s.m });
    if (!known) { peers.set(peerId, p); pushChat({ kind: "ooc", text: `${p.name} arrive en ville.` }); }
  };
  net.chat.onMessage = (m) => {
    if (!m || typeof m.text !== "string") return;
    if (m.kind === "radio" && !FACTIONS[me.faction].canRadio) return;
    if (m.r > 0 && Math.hypot(m.x - me.x, m.y - me.y) > m.r) return;
    pushChat({ kind: clean(m.kind, 10), text: clean(m.text, 300) });
  };
  net.alert.onMessage = (t) => { alertText = ALERTS.includes(t) ? t : ""; };
}

function emit(kind, text, range = 0) {
  const msg = { kind, text, x: Math.round(me.x), y: Math.round(me.y), r: range };
  if (kind !== "radio" || FACTIONS[me.faction].canRadio) pushChat(msg);
  net.chat.send(msg);
}

// ---------- Commandes RP ----------
function handleChat(text) {
  text = text.trim().slice(0, 240);
  if (!text) return;
  const [cmd, ...rest] = text.split(" ");
  const arg = rest.join(" ");
  const info = (t) => pushChat({ kind: "info", text: t });
  if (!text.startsWith("/")) return emit("say", `${me.name} dit : « ${text} »`, CHAT_RANGE.say);
  switch (cmd.toLowerCase()) {
    case "/aide": return info("/me action · /w chuchoter · /y crier · // hors-RP · /r radio (CP) · /manger · /inv · /alerte 0-3 (CP) · E : utiliser");
    case "/me": return arg && emit("me", `** ${me.name} ${arg}`, CHAT_RANGE.say);
    case "/w": return arg && emit("whisper", `${me.name} chuchote : « ${arg} »`, CHAT_RANGE.whisper);
    case "/y": return arg && emit("yell", `${me.name} crie : « ${arg.toUpperCase()} »`, CHAT_RANGE.yell);
    case "//": case "/ooc": return arg && emit("ooc", `[OOC] ${me.name} : ${arg}`);
    case "/r":
      if (!FACTIONS[me.faction].canRadio) return info("Tu n'as pas de radio.");
      return arg && emit("radio", `[RADIO] ${me.cid} : ${arg}`);
    case "/manger":
      if (me.rations < 1) return info("Tu n'as pas de ration.");
      me.rations--; me.hunger = Math.min(100, me.hunger + 40); save();
      return emit("me", `** ${me.name} ouvre une ration et mange.`, CHAT_RANGE.say);
    case "/inv": return info(`Rations : ${me.rations} · Jetons : ${me.tokens} · Faim : ${Math.round(me.hunger)}%`);
    case "/alerte": {
      if (!["cp", "ota"].includes(me.faction)) return info("Accès refusé.");
      const lvl = Math.max(0, Math.min(3, parseInt(arg) || 0));
      alertText = ALERTS[lvl]; net.alert.send(alertText);
      return emit("dispatch", lvl ? `DISPATCH : ${ALERTS[lvl]}.` : "DISPATCH : fin d'alerte. Reprenez vos activités.");
    }
    default: return info("Commande inconnue. Tape /aide.");
  }
}

function useAction() {
  if (!DISPENSERS.some((d) => dist(me, d) < TILE * 1.6)) return pushChat({ kind: "info", text: "Rien à utiliser ici." });
  if (!["citizen", "cwu"].includes(me.faction)) return pushChat({ kind: "info", text: "Le distributeur ne répond qu'aux citoyens." });
  const wait = RATION_COOLDOWN_MS - (Date.now() - (me.lastRation || 0));
  if (wait > 0) return pushChat({ kind: "info", text: `Ration déjà attribuée. Prochaine dans ${Math.ceil(wait / 60000)} min.` });
  me.lastRation = Date.now(); me.rations++; me.tokens += 3; save();
  emit("me", `** Le distributeur délivre une ration à ${me.name}.`, CHAT_RANGE.say);
}

function save() {
  store.set(`c17-${me.name}-${me.faction}`, { cid: me.cid, rations: me.rations, tokens: me.tokens, hunger: me.hunger, lastRation: me.lastRation });
}

// ---------- Scène ----------
class CityScene extends Phaser.Scene {
  constructor() { super("city"); }

  create() {
    makeTileset(this);
    const data = MAP_ASCII.map((row) => [...row].map((ch) => Math.max(0, TILE_ORDER.indexOf(ch))));
    const map = this.make.tilemap({ data, tileWidth: TILE, tileHeight: TILE });
    map.createLayer(0, map.addTilesetImage("tiles"), 0, 0);

    const cam = this.cameras.main;
    cam.setBounds(0, 0, MAP_W * TILE, MAP_H * TILE).setRoundPixels(true);
    const fit = () => cam.setZoom(Math.max(2, Math.floor(Math.min(window.innerWidth / 200, window.innerHeight / 140))));
    fit(); this.scale.on("resize", fit);

    this.sprites = new Map();
    this.keys = this.input.keyboard.addKeys("W,A,S,D,Z,Q,UP,DOWN,LEFT,RIGHT,E", false);
    this.keys.E.on("down", (_k, ev) => { if (!isTyping() && ev?.target?.tagName !== "INPUT") useAction(); });
    this.sendAcc = 0; this.lastSent = "";
  }

  spriteFor(id, p) {
    let s = this.sprites.get(id);
    if (s && s.faction !== p.faction) { s.sprite.destroy(); s.label.destroy(); s = null; }
    if (!s) {
      const key = makeCharacter(this, p.faction);
      const sprite = this.add.sprite(p.x, p.y, key, 0).setOrigin(0.5, 0.7);
      const label = this.add.text(p.x, p.y, p.name, {
        fontFamily: "monospace", fontSize: "5px", color: id === "me" ? "#ffd36b" : "#e6f4f8",
        stroke: "#000", strokeThickness: 2, resolution: 6,
      }).setOrigin(0.5, 1).setDepth(10000);
      s = { sprite, label, key, faction: p.faction };
      this.sprites.set(id, s);
      if (id === "me") this.cameras.main.startFollow(sprite, true, 0.15, 0.15);
    }
    return s;
  }

  update(_t, dt) {
    // Déplacement local (collisions calculées ici)
    const k = this.keys, typing = isTyping();
    let dx = 0, dy = 0;
    if (!typing) {
      dx = (k.D.isDown || k.RIGHT.isDown ? 1 : 0) - (k.A.isDown || k.Q.isDown || k.LEFT.isDown ? 1 : 0);
      dy = (k.S.isDown || k.DOWN.isDown ? 1 : 0) - (k.W.isDown || k.Z.isDown || k.UP.isDown ? 1 : 0);
    }
    if (dx && dy) { dx *= Math.SQRT1_2; dy *= Math.SQRT1_2; }
    me.moving = !!(dx || dy);
    if (me.moving) {
      const step = PLAYER_SPEED * Math.min(dt, 50) / 1000;
      me.dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : (dy > 0 ? "down" : "up");
      if (!collides(me.x + dx * step, me.y, me.faction)) me.x += dx * step;
      if (!collides(me.x, me.y + dy * step, me.faction)) me.y += dy * step;
    }
    me.hunger = Math.max(0, me.hunger - dt / 600000 * 10); // -1 % toutes les minutes

    // Envoi réseau ~12 Hz + battement toutes les 2 s
    this.sendAcc += dt;
    const sig = JSON.stringify(pack());
    if ((sig !== this.lastSent && this.sendAcc > 80) || this.sendAcc > 2000) {
      net.state.send(pack()); this.lastSent = sig; this.sendAcc = 0;
    }

    // Rendu
    const all = [["me", me], ...peers];
    const alive = new Set(all.map(([id]) => id));
    this.sprites.forEach((s, id) => { if (!alive.has(id)) { s.sprite.destroy(); s.label.destroy(); this.sprites.delete(id); } });
    for (const [id, p] of all) {
      const { sprite, label, key } = this.spriteFor(id, p);
      const lerp = id === "me" ? 1 : 0.25;
      sprite.x = Phaser.Math.Linear(sprite.x, p.x, lerp);
      sprite.y = Phaser.Math.Linear(sprite.y, p.y, lerp);
      sprite.setDepth(sprite.y);
      label.setPosition(Math.round(sprite.x), Math.round(sprite.y - 11));
      const d = p.dir === "left" || p.dir === "right" ? "side" : (p.dir === "up" ? "up" : "down");
      sprite.setFlipX(p.dir === "left");
      if (p.moving) sprite.play(`${key}-${d}`, true);
      else { sprite.stop(); sprite.setFrame({ down: 0, up: 2, side: 4 }[d]); }
    }
    this.updateHud();
  }

  updateHud() {
    const clock = Math.floor(Date.now() / 1000) % 1440; // horloge commune à tous : 1 min IG = 1 s
    const h = Math.floor(clock / 60), m = clock % 60;
    $("clock").textContent = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
    $("alert").textContent = alertText ? `⚠ ${alertText}` : "";
    $("night").style.opacity = h >= 21 || h < 6 ? 0.7 : h >= 19 ? 0.35 : h < 8 ? 0.3 : 0;
    $("hud-stats").innerHTML =
      `${FACTIONS[me.faction].name} · #${me.cid} · ${peers.size + 1} en ligne<br>` +
      `Faim ${Math.round(me.hunger)}% · Rations ${me.rations} · Jetons ${me.tokens}`;
    $("hint").textContent = DISPENSERS.some((d) => dist(me, d) < TILE * 1.6) ? "[E] Distributeur de rations" : "";
  }
}

$("login").addEventListener("submit", (ev) => {
  ev.preventDefault();
  const name = $("name").value.replace(/[^\p{L}\p{N} '.-]/gu, "").trim().slice(0, 24) || "Inconnu";
  const faction = FACTIONS[$("faction").value] ? $("faction").value : "citizen";
  const saved = store.get(`c17-${name}-${faction}`) || {};
  const sp = FACTIONS[faction].spawn;
  me = {
    name, faction, dir: "down", moving: false,
    x: sp.x * TILE + 8 + rand(-6, 6), y: sp.y * TILE + 8,
    cid: saved.cid || (faction === "cp" ? `C17.i${rand(1, 5)}.UNION-${rand(10, 99)}` : String(rand(10000, 99999))),
    rations: saved.rations ?? 0, tokens: saved.tokens ?? (faction === "cwu" ? 15 : faction === "citizen" ? 5 : 0),
    hunger: saved.hunger ?? 100, lastRation: saved.lastRation || 0,
  };
  setInterval(save, 15000);

  setupNet();
  $("login").remove(); $("hud").hidden = false; $("chat").hidden = false;
  initChat({ send: (_t, text) => handleChat(text) });
  pushChat({ kind: "info", text: `Bienvenue à City 17. Ton matricule : #${me.cid}. Tape /aide.` });
  pushChat({ kind: "ooc", text: "Recherche d'autres joueurs…" });

  new Phaser.Game({
    type: Phaser.AUTO, parent: "game", backgroundColor: "#0b0e10", pixelArt: true,
    scale: { mode: Phaser.Scale.RESIZE, width: window.innerWidth, height: window.innerHeight },
    scene: [CityScene],
  });
});
