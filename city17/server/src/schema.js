import { Schema, MapSchema, defineTypes } from "@colyseus/schema";

export class Player extends Schema {
  constructor() {
    super();
    this.name = "";
    this.faction = "citizen";
    this.cid = "";        // n° d'identification citoyen / matricule CP
    this.x = 0;
    this.y = 0;
    this.dir = "down";
    this.moving = false;
    this.hunger = 100;
    this.rations = 0;
    this.tokens = 0;
  }
}
defineTypes(Player, {
  name: "string", faction: "string", cid: "string",
  x: "number", y: "number", dir: "string", moving: "boolean",
  hunger: "number", rations: "number", tokens: "number",
});

export class CityState extends Schema {
  constructor() {
    super();
    this.players = new MapSchema();
    this.clock = 0; // minutes in-game (0-1439)
    this.alert = "";  // code civique en cours
  }
}
defineTypes(CityState, { players: { map: Player }, clock: "number", alert: "string" });
