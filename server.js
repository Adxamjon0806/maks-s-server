const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const path = require("path");

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

let helperSocket = null;

// Отдача статического HTML
app.use(express.static(path.join(__dirname, "public")));

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

// Отправка ответа обратно helper.js
function sendAnswer(questionId, answerText) {
  if (helperSocket && helperSocket.readyState === WebSocket.OPEN) {
    helperSocket.send(
      JSON.stringify({
        type: "answer",
        questionId,
        answer: answerText,
      })
    );
  }
}

server.listen(5080, () => {
  console.log("Server running at http://localhost:8080/");
});

module.exports = { sendAnswer };
