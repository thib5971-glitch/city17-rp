# City 17 RP

HL2RP en vue de dessus, style 8-bit, multijoueur dans le navigateur.
**Phaser 3** (client) · **Colyseus** (serveur autoritaire) · monorepo npm workspaces.

> Projet fan non officiel. Tout le pixel art est généré en code : n'ajoute aucun asset extrait des jeux Valve.

## Lancer en local

```bash
npm install
npm run dev
```

Ouvre http://localhost:5173 dans deux onglets pour tester à plusieurs.
Variable `VITE_SERVER_URL` pour pointer le client vers un serveur distant.

## Contrôles

| Touche | Action |
|---|---|
| ZQSD / WASD / flèches | Se déplacer |
| E | Utiliser (distributeur de rations) |
| Entrée | Parler · Échap pour annuler |

## Commandes RP

`/me` action · `/w` chuchoter · `/y` crier · `//` ou `/ooc` hors-RP · `/r` radio (CP/OTA)
`/manger` · `/inv` · `/alerte 0-3` (CP/OTA) · `/aide`

## Ce qui marche déjà (v0.1)

- Multijoueur temps réel, mouvement validé côté serveur avec collisions
- Factions : Citoyen, CWU, Protection Civile, Résistance (OTA verrouillée en whitelist)
- Matricule citoyen / matricule CP généré à l'arrivée
- Chat de proximité (dire / chuchoter / crier / me), OOC global, radio Combine
- Champs de force que seuls CP/OTA traversent
- Distributeur de rations avec cooldown, faim, jetons
- Horloge en jeu, cycle jour/nuit, alertes Dispatch

## Structure

```
shared/   carte ASCII, factions, constantes, collisions (partagé client + serveur)
server/   Colyseus : CityRoom (logique RP), schema (état synchronisé)
client/   Phaser : rendu, pixel art procédural (art.js), HUD + chat (ui.js)
```

La carte se modifie directement dans `shared/map.js` (1 caractère = 1 tuile).

## Roadmap

1. **Persistance** : comptes, personnages multiples, sauvegarde (SQLite puis Postgres)
2. **Inventaire en grille** + objets (nourriture, outils, armes, cartes CID, papiers)
3. **Portes verrouillables**, appartements attribués, combine locks
4. **Système CP** : fouille, menottes, matraque, prison, points de loyauté/infraction, terminal de données
5. **Combat** : santé, mêlée, armes à feu, KO / mort RP
6. **Économie** : boutiques CWU, salaires, marché noir rebelle
7. **Maps Tiled** (`.tmj`) + plusieurs zones (Canaux, Nexus, Outlands) reliées par transitions
8. **Admin** : rangs, whitelist OTA/CP, logs, kick/ban, tickets
9. Sprites dessinés à la main (Aseprite), sons 8-bit, éclairage dynamique
