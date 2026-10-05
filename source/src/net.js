// Multijoueur sans serveur : WebRTC pair-à-pair, mise en relation via relais Nostr publics.
import { joinRoom, selfId } from "trystero";

const APP_ID = "city17-rp-thib5971";

export function connect(roomName = "city17") {
  const room = joinRoom({
    appId: APP_ID,
    relayConfig: { urls: ["wss://relay.damus.io", "wss://nos.lol", "wss://relay.primal.net", "wss://relay.nostr.band", "wss://nostr.mom"], redundancy: 4 },
  }, roomName);
  const state = room.makeAction("st");
  const chat = room.makeAction("ch");
  const alert = room.makeAction("al");
  return { room, state, chat, alert, selfId };
}
