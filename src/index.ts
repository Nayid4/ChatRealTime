// server.ts
import index from "../public/index.html";

interface WebSocketData {
  id: string;
  username: string;
  channel: string;
}

const server = Bun.serve<WebSocketData>({
  port: 3100,
  routes: {
      "/": index,
    },
  fetch(req, server) {
    const url = new URL(req.url);
    const username = url.searchParams.get("username");
    const id = url.searchParams.get("id");
    const channelId = url.searchParams.get("channelId") || "general";

    if (!username || !id) return new Response("Missing params", { status: 400 });

    const success = server.upgrade(req, {
      data: { id, username, channel: channelId },
    });
    return success ? undefined : new Response("Upgrade failed", { status: 500 });
  },
  websocket: {
    open(ws) {
      ws.subscribe("presence"); // Canal para saber quién está online
      ws.subscribe("general");
      ws.subscribe(ws.data.channel);

      // Notificar a todos que alguien se conectó
      server.publish("presence", JSON.stringify({
        type: "USER_JOINED",
        user: { id: ws.data.id, username: ws.data.username }
      }));
    },
    message(ws, message) {
      const payload = JSON.stringify({
        type: "TEXT_MESSAGE",
        senderId: ws.data.id,
        senderName: ws.data.username,
        text: message,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        channel: ws.data.channel
      });
      server.publish(ws.data.channel, payload);
    },
    close(ws) {
      server.publish("presence", JSON.stringify({
        type: "USER_LEFT",
        userId: ws.data.id
      }));
    }
  },
});