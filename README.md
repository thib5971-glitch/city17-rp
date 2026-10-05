# City 17 RP

HL2RP en vue de dessus, style 8-bit, multijoueur dans le navigateur, **sans serveur**.
Les joueurs se connectent directement entre eux (WebRTC pair-à-pair via Trystero).

**Jouer :** ouvre la page GitHub Pages du repo, choisis un nom et une faction, c'est parti.

## Contrôles
ZQSD / WASD / flèches : bouger · E : utiliser · Entrée : parler · Échap : annuler

## Commandes RP
`/me` · `/w` chuchoter · `/y` crier · `//` hors-RP · `/r` radio (CP) · `/manger` · `/inv` · `/alerte 0-3` (CP) · `/aide`

## Contenu
- Factions : Citoyen, CWU, Protection Civile, Résistance
- Chat de proximité, radio Combine, alertes Dispatch
- Champs de force réservés aux CP, distributeur de rations, faim, jetons
- Horloge commune et cycle jour/nuit
- Pixel art 100 % généré en code (aucun asset Valve)

## Modifier le jeu
Le code est dans `src/` (carte ASCII dans `src/map.js`). `npm install` puis `npm run build` régénère `index.html`.
