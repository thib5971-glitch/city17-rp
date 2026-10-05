export const FACTIONS = {
  citizen: { name: "Citoyen", color: 0x4a6b8a, accent: 0xc9b38a, spawn: { x: 10, y: 21 }, canRadio: false },
  cwu:     { name: "Union des Travailleurs", color: 0xb5822f, accent: 0x3a3a3a, spawn: { x: 4, y: 3 }, canRadio: false },
  cp:      { name: "Protection Civile", color: 0x2b3440, accent: 0x7fd4ff, spawn: { x: 35, y: 3 }, canRadio: true },
  ota:     { name: "Overwatch", color: 0x5a5f4a, accent: 0xff5040, spawn: { x: 36, y: 4 }, canRadio: true, locked: true },
  rebel:   { name: "Résistance", color: 0x6b4a2b, accent: 0xff9a3a, spawn: { x: 35, y: 17 }, canRadio: false },
};

export const PLAYER_SPEED = 70;   // pixels / seconde
export const TICK_RATE = 20;      // Hz serveur
export const RATION_COOLDOWN_MS = 5 * 60 * 1000;
export const CHAT_RANGE = { say: 120, whisper: 32, yell: 260 };
