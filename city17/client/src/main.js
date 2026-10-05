import Phaser from "phaser";
import { Client, getStateCallbacks } from "colyseus.js";
import { MAP_ASCII, TILE, MAP_W, MAP_H, FACTIONS, findTiles } from "@city17/shared";
import { makeTileset, makeCharacter, TILE_ORDER } from "./art.js";
import { initChat, pushChat, isTyping } from "./ui.js";

const SERVER_URL = import.meta.env.VITE_SERVER_URL || `ws://${location.hostname}:2567`;
const DISPENSERS = findTiles("R").map((t) => ({ x: t.x * TILE + 8, y: t.y * TILE + 8 }));
const $ = (id) => document.getElementById(id);

class CityScene extends Phaser.Scene {
  constructor() { super("city"); }
  init(data) { this.room = data.room; }

  create() {
    makeTileset(this);
    const data = MAP_ASCII.map((row) => [...row].map((ch) => Math.max(0, TILE_ORDER.indexOf(ch))));
    const map = this.make.tilemap({ data, tileWidth: TILE, tileHeight: TILE });
    map.createLayer(0, map.addTilesetImage("tiles"), 0, 0);

    const cam = this.cameras.main;
    cam.setBounds(0, 0, MAP_W * TILE, MAP_H * TILE).setRoundPixels(true);
    const fit = () => cam.setZoom(Math.max(2, Math.floor(Math.min(window.innerWidth / 200, window.innerHeight / 140))));
    fit(); this.scale.on("resize", fit);

    this.entities = new Map();
    const S = getStateCallbacks(this.room);
    S(this.room.state).players.onAdd((p, id) => this.addEntity(p, id));
    S(this.room.state).players.onRemove((_, id) => {
      const e = this.entities.get(id); if (!e) return;
      e.sprite.destroy(); e.label.destroy(); this.entities.delete(id);
    });

    this.keys = this.input.keyboard.addKeys("W,A,S,D,Z,Q,UP,DOWN,LEFT,RIGHT,E", false);
    this.keys.E.on("down", (_k, ev) => { if (!isTyping() && ev?.target?.tagName !== "INPUT") this.room.send("use"); });
    this.lastInput = "";
  }

  addEntity(p, id) {
    const key = makeCharacter(this, p.faction);
    const sprite = this.add.sprite(p.x, p.y, key, 0).setOrigin(0.5, 0.7);
    const label = this.add.text(p.x, p.y - 12, p.name, {
      fontFamily: "monospace", fontSize: "5px", color: id === this.room.sessionId ? "#ffd36b" : "#e6f4f8",
      stroke: "#000", strokeThickness: 2, resolution: 6,
    }).setOrigin(0.5, 1);
    this.entities.set(id, { p, sprite, label, key });
    if (id === this.room.sessionId) this.cameras.main.startFollow(sprite, true, 0.15, 0.15);
  }

  update() {
    // Entrées (ZQSD + WASD + flèches)
    const k = this.keys, typing = isTyping();
    const input = typing ? { up: 0, down: 0, left: 0, right: 0 } : {
      up: k.W.isDown || k.Z.isDown || k.UP.isDown, down: k.S.isDown || k.DOWN.isDown,
      left: k.A.isDown || k.Q.isDown || k.LEFT.isDown, right: k.D.isDown || k.RIGHT.isDown,
    };
    const sig = JSON.stringify(input);
    if (sig !== this.lastInput) { this.lastInput = sig; this.room.send("input", input); }

    // Interpolation + animation
    this.entities.forEach(({ p, sprite, label, key }) => {
      sprite.x = Phaser.Math.Linear(sprite.x, p.x, 0.3);
      sprite.y = Phaser.Math.Linear(sprite.y, p.y, 0.3);
      sprite.setDepth(sprite.y);
      label.setPosition(Math.round(sprite.x), Math.round(sprite.y - 11)).setDepth(10000);
      const d = p.dir === "left" || p.dir === "right" ? "side" : p.dir;
      sprite.setFlipX(p.dir === "left");
      if (p.moving) sprite.play(`${key}-${d}`, true);
      else { sprite.stop(); sprite.setFrame({ down: 0, up: 2, side: 4 }[d]); }
    });

    this.updateHud();
  }

  updateHud() {
    const s = this.room.state, me = s.players.get(this.room.sessionId);
    const h = Math.floor(s.clock / 60), m = s.clock % 60;
    $("clock").textContent = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
    $("alert").textContent = s.alert ? `⚠ ${s.alert}` : "";
    const dark = h >= 21 || h < 6 ? 0.7 : h >= 19 ? 0.35 : h < 8 ? 0.3 : 0;
    $("night").style.opacity = dark;
    if (!me) return;
    $("hud-stats").innerHTML =
      `${FACTIONS[me.faction].name} · #${me.cid}<br>Faim ${me.hunger}% · Rations ${me.rations} · Jetons ${me.tokens}`;
    const near = DISPENSERS.some((d) => Math.hypot(d.x - me.x, d.y - me.y) < TILE * 1.6);
    $("hint").textContent = near ? "[E] Distributeur de rations" : "";
  }
}

$("login").addEventListener("submit", async (ev) => {
  ev.preventDefault();
  $("login-error").textContent = "Connexion…";
  try {
    const room = await new Client(SERVER_URL).joinOrCreate("city17", {
      name: $("name").value.trim(), faction: $("faction").value,
    });
    $("login").remove(); $("hud").hidden = false; $("chat").hidden = false;
    initChat(room);
    room.onMessage("chat", pushChat);
    room.onLeave(() => pushChat({ kind: "dispatch", text: "Connexion perdue avec le serveur." }));
    new Phaser.Game({
      type: Phaser.AUTO, parent: "game", backgroundColor: "#0b0e10", pixelArt: true,
      scale: { mode: Phaser.Scale.RESIZE, width: window.innerWidth, height: window.innerHeight },
      scene: [],
    }).scene.add("city", CityScene, true, { room });
  } catch (e) {
    console.error(e);
    $("login-error").textContent = "Serveur injoignable. Lance `npm run dev` à la racine.";
  }
});
