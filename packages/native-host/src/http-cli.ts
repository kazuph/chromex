import { HttpBridgeServer, DEFAULT_HTTP_BRIDGE_PORT } from "./http-server.js";
import { NativeHostRelay } from "./relay.js";

const relay = new NativeHostRelay();
relay.start({ enableNativeMessaging: false });

const allowedOrigins = (process.env.BRIDGE_ALLOWED_ORIGINS ?? "")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);
const port = Number.parseInt(process.env.BRIDGE_HTTP_PORT ?? "", 10) || DEFAULT_HTTP_BRIDGE_PORT;
const server = new HttpBridgeServer(relay, {
  port,
  allowedOrigins,
});

await server.start();
