import express from "express";
import http from "http";
import { WebSocketServer } from "ws";
import path from "path";
import { fileURLToPath } from "url";
import router from "./router.js";
import cors from "cors";

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

let helperSocket = null;

const __filename = fileURLToPath(import.meta.url); // абсолютный путь к файлу
const __dirname = path.dirname(__filename);

app.use(cors());
app.use(express.json());
app.use("", router);

// Подключение WebSocket
wss.on("connection", function connection(ws) {
  ws.on("message", function incoming(message) {
    try {
      const data = JSON.parse(message);

      if (data.role === "helper") {
        console.log("Client registered as helper.");
        helperSocket = ws;
      }

      if (data.type === "screenshot") {
        console.log("Received screenshot:", data.questionId);

        // Рассылаем скриншот всем подключенным фронтам
        wss.clients.forEach(function each(client) {
          if (client === helperSocket && client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(data));
          }
        });
      }

      if (data.type === "answer") {
        wss.clients.forEach(function each(client) {
          if (client !== helperSocket && client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(data));
          }
        });
      }

      if (data.type === "pageHTML") {
        console.log("Received page HTML (ignored on server).");
      }
    } catch (err) {
      console.error("Error parsing message:", err.message);
    }
  });

  ws.on("close", () => {
    if (ws === helperSocket) {
      console.log("Helper disconnected.");
      helperSocket = null;
    }
  });
});

server.listen(5080, () => {
  console.log("Server running at http://localhost:5080/");
});

export { __dirname };
