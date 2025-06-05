// tcp-bridge.js – listen for Pico lines, drive device.linear()
import net from "net";

const PORT   = 8765;
const MOVE_MS = 400;          // duration argument for device.linear()

const server = net.createServer(socket => {
  console.log("Pico connected");

  let buf = "";
  socket.on("data", chunk => {
    buf += chunk.toString();
    let idx;
    while ((idx = buf.indexOf("\n")) >= 0) {
      const line = buf.slice(0, idx);   // one line
      buf = buf.slice(idx + 1);
      try {
        const { p } = JSON.parse(line);
        if (globalThis.device?.linear)
          globalThis.device.linear(p, MOVE_MS);
      } catch (e) {
        console.error("bad line", line, e);
      }
    }
  });

  socket.on("close", () => console.log("Pico disconnected"));
});

server.listen(PORT, () => console.log("TCP bridge listening on", PORT));
