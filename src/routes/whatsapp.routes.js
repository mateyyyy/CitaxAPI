const express = require("express");
const router = express.Router();
const authMiddleware = require("../middlewares/auth.middleware");
const pool = require("../config/db");
const {
  createInstanceQr,
  getCurrentInstance,
  disconnectCurrentInstance,
  handleWebhook,
  getMessages,
  sendMessage,
} = require("../controllers/whatsapp.controller");

// WEBHOOK route - MUST be public (no authMiddleware)
router.post("/webhook/:instanceName", handleWebhook);

// Protected routes
router.use(authMiddleware);

router.post("/create-instance", createInstanceQr);
router.get("/status", getCurrentInstance);
router.get("/messages", getMessages);
router.post("/send-message", sendMessage);
router.post("/disconnect", disconnectCurrentInstance);

// ─── Bot active status ───────────────────────────────────────────────
router.get("/bot-status", async (req, res) => {
  try {
    const [rows] = await pool.execute(
      "SELECT bot_config FROM EMPRESA WHERE id_empresa = ? LIMIT 1",
      [req.user.id_empresa]
    );

    if (!rows.length) {
      return res.status(404).json({ error: "Empresa no encontrada" });
    }

    let config = {};
    try {
      config = typeof rows[0].bot_config === "string"
        ? JSON.parse(rows[0].bot_config || "{}")
        : rows[0].bot_config || {};
    } catch (_) {
      config = {};
    }

    res.json({ bot_activo: config.bot_activo !== false });
  } catch (err) {
    console.error("Error al obtener bot-status:", err.message);
    res.status(500).json({ error: "Error al obtener estado del bot" });
  }
});

router.put("/bot-status", async (req, res) => {
  try {
    const [rows] = await pool.execute(
      "SELECT bot_config FROM EMPRESA WHERE id_empresa = ? LIMIT 1",
      [req.user.id_empresa]
    );

    if (!rows.length) {
      return res.status(404).json({ error: "Empresa no encontrada" });
    }

    let config = {};
    try {
      config = typeof rows[0].bot_config === "string"
        ? JSON.parse(rows[0].bot_config || "{}")
        : rows[0].bot_config || {};
    } catch (_) {
      config = {};
    }

    const nextBotActivo = req.body.bot_activo !== false;
    config.bot_activo = nextBotActivo;

    await pool.execute(
      "UPDATE EMPRESA SET bot_config = ? WHERE id_empresa = ?",
      [JSON.stringify(config), req.user.id_empresa]
    );

    res.json({ bot_activo: nextBotActivo });
  } catch (err) {
    console.error("Error al actualizar bot-status:", err.message);
    res.status(500).json({ error: "Error al actualizar estado del bot" });
  }
});

module.exports = router;
