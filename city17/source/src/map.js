// Carte de City 17 en ASCII — modifie-la directement, chaque caractère = 1 tuile.
// #  mur            .  rue             ,  sol intérieur
// D  porte          =  champ de force Combine (seuls CP/OTA passent)
// R  distributeur de rations          N  nexus / bureau CP (sol)
// P  place (pavés)  ~  canal (bloquant)
export const MAP_ASCII = [
  "########################################",
  "#,,,,,,,#......................#NNNNNNN#",
  "#,,,,,,,#......................#NNNNNNN#",
  "#,,,,,,,D......................=NNNNNNN#",
  "#,,,,,,,#......................#NNNNNNN#",
  "#########......................#NNNNNNN#",
  "#..............................####=####",
  "#......PPPPPPPPPPPPPPPPPPPP............#",
  "#......PPPPPPPPPPPPPPPPPPPP............#",
  "#......PPPPPPPPPRPPPPPPPPPP............#",
  "#......PPPPPPPPPPPPPPPPPPPP............#",
  "#......PPPPPPPPPPPPPPPPPPPP............#",
  "#......................................#",
  "#~~~~~~~~~~~~~~~...~~~~~~~~~~~~~~~~~~~~#",
  "#......................................#",
  "#..........######D######.......#####D###",
  "#..........#,,,,,,,,,,,#.......#,,,,,,,#",
  "#..........#,,,,,,,,,,,#.......#,,,,,,,#",
  "#..........#,,,,,,,,,,,#.......#,,,,,,,#",
  "#..........#############.......#########",
  "#......................................#",
  "#......................................#",
  "#......................................#",
  "########################################",
];

export const TILE = 16;
export const MAP_W = MAP_ASCII[0].length;
export const MAP_H = MAP_ASCII.length;

export function tileAt(tx, ty) {
  if (tx < 0 || ty < 0 || tx >= MAP_W || ty >= MAP_H) return "#";
  return MAP_ASCII[ty][tx];
}

export function isSolid(ch, faction) {
  if (ch === "#" || ch === "~" || ch === "R") return true;
  if (ch === "=") return !(faction === "cp" || faction === "ota");
  return false;
}

// Collision d'une hitbox (centre x,y, demi-taille h) contre la carte.
export function collides(x, y, faction, h = 5) {
  const pts = [[x - h, y - h], [x + h, y - h], [x - h, y + h], [x + h, y + h]];
  return pts.some(([px, py]) => isSolid(tileAt(Math.floor(px / TILE), Math.floor(py / TILE)), faction));
}

export function findTiles(ch) {
  const out = [];
  MAP_ASCII.forEach((row, y) => [...row].forEach((c, x) => c === ch && out.push({ x, y })));
  return out;
}
