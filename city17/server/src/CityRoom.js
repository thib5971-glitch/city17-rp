import { Room } from "colyseus";
import { CityState, Player } from "./schema.js";
import {
  TILE, FACTIONS, PLAYER_SPEED, TICK_RATE, RATION_COOLDOWN_MS, CHAT_RANGE,
  collides, findTiles,
} from "@city17/shared";

const DISPENSERS = findTiles("R");
const ALERTS = ["", "Infection anticitoyenne détectée", "Code : mise sous contrôle", "Jugement immédiat"];

export class CityRoom extends Room {
  maxClients = 64;

  onCreate() {
    this.setState(new CityState());
    this.state.clock = 8 * 60;
    this.inputs = new Map();
    this.lastRation = new Map(); // cid -> timestamp
    this.setSimulationInterval((dt) => this.update(dt), 1000 / TICK_RATE);

    this.onMessage("input", (client, input) => {
      this.inputs.set(client.sessionId, {
        up: !!input.up, down: !!input.down, left: !!input.left, right: !!input.right,
      });
    });
    this.onMessage("chat", (client, text) => this.handleChat(client, String(text ?? "").slice(0, 240)));
    this.onMessage("use", (client) => this.handleUse(client));
  }

  onJoin(client, opts = {}) {
    let faction = FACTIONS[opts.faction] ? opts.faction : "citizen";
    if (FACTIONS[faction].locked) faction = "citizen"; // whitelist à brancher plus tard
    const p = new Player();
    p.name = String(opts.name || "Inconnu").replace(/[^\p{L}\p{N} '.-]/gu, "").slice(0, 24) || "Inconnu";
    p.faction = faction;
    p.cid = faction === "cp" ? `C17.i${rand(1, 5)}.UNION-${rand(10, 99)}` : String(rand(10000, 99999));
    const sp = FACTIONS[faction].spawn;
    p.x = sp.x * TILE + TILE / 2;
    p.y = sp.y * TILE + TILE / 2;
    p.tokens = faction === "citizen" ? 5 : faction === "cwu" ? 15 : 0;
    this.state.players.set(client.sessionId, p);
    this.system(`${p.name} arrive en ville.`, "ooc");
    client.send("chat", { kind: "info", text: `Bienvenue à City 17. Ton matricule : #${p.cid}. Tape /aide.` });
  }

  onLeave(client) {
    const p = this.state.players.get(client.sessionId);
    if (p) this.system(`${p.name} a quitté la ville.`, "ooc");
    this.state.players.delete(client.sessionId);
    this.inputs.delete(client.sessionId);
  }

  update(dt) {
    const step = PLAYER_SPEED * (dt / 1000);
    this.state.players.forEach((p, id) => {
      const i = this.inputs.get(id);
      if (!i) return;
      let dx = (i.right ? 1 : 0) - (i.left ? 1 : 0);
      let dy = (i.down ? 1 : 0) - (i.up ? 1 : 0);
      if (dx && dy) { dx *= Math.SQRT1_2; dy *= Math.SQRT1_2; }
      p.moving = !!(dx || dy);
      if (!p.moving) return;
      p.dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : (dy > 0 ? "down" : "up");
      const nx = p.x + dx * step, ny = p.y + dy * step;
      if (!collides(nx, p.y, p.faction)) p.x = nx;
      if (!collides(p.x, ny, p.faction)) p.y = ny;
    });

    // horloge : 1 minute IG = 1 seconde réelle
    this.clockAcc = (this.clockAcc || 0) + dt;
    while (this.clockAcc >= 1000) {
      this.clockAcc -= 1000;
      this.state.clock = (this.state.clock + 1) % 1440;
      if (this.state.clock % 10 === 0) {
        this.state.players.forEach((p) => {
          if (p.faction !== "ota") p.hunger = Math.max(0, p.hunger - 1);
        });
      }
    }
  }

  handleUse(client) {
    const p = this.state.players.get(client.sessionId);
    if (!p) return;
    const near = DISPENSERS.some((d) => dist(p, center(d)) < TILE * 1.6);
    if (!near) return client.send("chat", { kind: "info", text: "Rien à utiliser ici." });
    if (!["citizen", "cwu"].includes(p.faction))
      return client.send("chat", { kind: "info", text: "Le distributeur ne répond qu'aux citoyens." });
    const last = this.lastRation.get(p.cid) || 0;
    const wait = RATION_COOLDOWN_MS - (Date.now() - last);
    if (wait > 0)
      return client.send("chat", { kind: "info", text: `Ration déjà attribuée. Prochaine dans ${Math.ceil(wait / 60000)} min.` });
    this.lastRation.set(p.cid, Date.now());
    p.rations += 1;
    p.tokens += 3;
    this.broadcastNear(p, CHAT_RANGE.say, { kind: "me", text: `** Le distributeur délivre une ration à ${p.name}.` });
  }

  handleChat(client, text) {
    const p = this.state.players.get(client.sessionId);
    if (!p || !text.trim()) return;
    const [cmd, ...rest] = text.trim().split(" ");
    const arg = rest.join(" ");
    const reply = (t) => client.send("chat", { kind: "info", text: t });

    if (!text.startsWith("/")) return this.broadcastNear(p, CHAT_RANGE.say, { kind: "say", text: `${p.name} dit : « ${text} »` });

    switch (cmd.toLowerCase()) {
      case "/aide":
        return reply("/me action · /w chuchoter · /y crier · // ou /ooc hors-RP · /r radio (CP) · /manger · /inv · /alerte <0-3> (CP) · E : utiliser");
      case "/me":  return arg && this.broadcastNear(p, CHAT_RANGE.say, { kind: "me", text: `** ${p.name} ${arg}` });
      case "/w":   return arg && this.broadcastNear(p, CHAT_RANGE.whisper, { kind: "whisper", text: `${p.name} chuchote : « ${arg} »` });
      case "/y":   return arg && this.broadcastNear(p, CHAT_RANGE.yell, { kind: "yell", text: `${p.name} crie : « ${arg.toUpperCase()} »` });
      case "//":
      case "/ooc": return arg && this.broadcast("chat", { kind: "ooc", text: `[OOC] ${p.name} : ${arg}` });
      case "/r": {
        if (!FACTIONS[p.faction].canRadio) return reply("Tu n'as pas de radio.");
        if (!arg) return;
        this.clients.forEach((c) => {
          const o = this.state.players.get(c.sessionId);
          if (o && FACTIONS[o.faction].canRadio) c.send("chat", { kind: "radio", text: `[RADIO] ${p.cid} : ${arg}` });
        });
        return this.broadcastNear(p, CHAT_RANGE.whisper, { kind: "whisper", text: `${p.name} murmure dans sa radio.` }, client.sessionId);
      }
      case "/manger":
        if (p.rations < 1) return reply("Tu n'as pas de ration.");
        p.rations -= 1; p.hunger = Math.min(100, p.hunger + 40);
        return this.broadcastNear(p, CHAT_RANGE.say, { kind: "me", text: `** ${p.name} ouvre une ration et mange.` });
      case "/inv":
        return reply(`Rations : ${p.rations} · Jetons : ${p.tokens} · Faim : ${p.hunger}%`);
      case "/alerte": {
        if (!["cp", "ota"].includes(p.faction)) return reply("Accès refusé.");
        const lvl = Math.max(0, Math.min(3, parseInt(arg) || 0));
        this.state.alert = ALERTS[lvl];
        return this.broadcast("chat", { kind: "dispatch", text: lvl ? `DISPATCH : ${ALERTS[lvl]}.` : "DISPATCH : fin d'alerte. Reprenez vos activités." });
      }
      default:
        return reply("Commande inconnue. Tape /aide.");
    }
  }

  broadcastNear(src, range, msg, exceptId) {
    this.clients.forEach((c) => {
      if (c.sessionId === exceptId) return;
      const o = this.state.players.get(c.sessionId);
      if (o && dist(o, src) <= range) c.send("chat", msg);
    });
  }

  system(text, kind = "info") { this.broadcast("chat", { kind, text }); }
}

const rand = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const center = (t) => ({ x: t.x * TILE + TILE / 2, y: t.y * TILE + TILE / 2 });
