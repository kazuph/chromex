import { NativeHostRelay } from "./relay.js";
import { HttpBridgeServer } from "./http-server.js";

const relay = new NativeHostRelay();
relay.start();

const httpServer = new HttpBridgeServer(relay, parseInt(process.env.BRIDGE_HTTP_PORT ?? "0", 10));
await httpServer.start();

