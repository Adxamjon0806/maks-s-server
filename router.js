import { Router } from "express";
import path from "path";
import { __dirname } from "./server.js";

const router = new Router();

router.get("/admin-panel", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});
router.get("/c", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "client.js"));
});

export default router;
