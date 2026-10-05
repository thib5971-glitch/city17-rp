import { Server } from "colyseus";
import { CityRoom } from "./CityRoom.js";

const port = Number(process.env.PORT || 2567);
const gameServer = new Server();
gameServer.define("city17", CityRoom);
gameServer.listen(port).then(() => console.log(`[City17] serveur en écoute sur ws://localhost:${port}`));
