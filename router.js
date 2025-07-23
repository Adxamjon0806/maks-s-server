import { Router } from "express";
import path from "path";
import { __dirname } from "./server.js";

const router = new Router();
let isOpenScript = true;

router.get("/admin-panel", (req, res) => {
  try {
    if (isOpenScript) {
      res.sendFile(path.join(__dirname, "public", "index.html"));
    } else {
      res.status(404).send("404 Not Found");
    }
  } catch (error) {
    res.send(JSON.stringify(error));
  }
});
router.get("/c", (req, res) => {
  try {
    if (isOpenScript) {
      res.sendFile(path.join(__dirname, "public", "client.js"));
    } else {
      res.status(404).send("404 Not Found");
    }
  } catch (error) {
    res.send(JSON.stringify(error));
  }
});
router.get("/toggle", (req, res) => {
  try {
    res.sendFile(path.join(__dirname, "public", "toggle.html"));
  } catch (error) {
    res.send(JSON.stringify(error));
  }
});
router.get("/access", (req, res) => {
  try {
    res.send(JSON.stringify({ isOpenScript }));
  } catch (error) {
    res.send(error);
  }
});
router.post("/change-access", (req, res) => {
  try {
    const data = req.body;
    isOpenScript = data.isOn;
    res.send(JSON.stringify({ isOpenScript }));
  } catch (error) {
    res.send(error);
  }
});
router.get("/proxy", (req, res) => {
  const rawUrl = req.query.url;

  if (!rawUrl) {
    return res.status(400).send("Missing 'url' query parameter");
  }

  let targetUrl;
  try {
    targetUrl = new URL(decodeURIComponent(rawUrl));
  } catch (err) {
    return res.status(400).send("Invalid URL");
  }

  const client = targetUrl.protocol === "https:" ? https : http;

  client
    .get(targetUrl.href, (imgRes) => {
      if (imgRes.statusCode !== 200) {
        return res.status(imgRes.statusCode).send("Error loading image");
      }

      res.setHeader(
        "Content-Type",
        imgRes.headers["content-type"] || "image/jpeg"
      );
      res.setHeader("Access-Control-Allow-Origin", "*");

      imgRes.pipe(res);
    })
    .on("error", (err) => {
      console.error("Proxy error:", err);
      res.status(500).send("Proxy error");
    });
});

export default router;
