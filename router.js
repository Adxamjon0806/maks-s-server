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

export default router;
