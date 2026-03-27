const express = require("express");
const router = express.Router();
const authMiddleware = require("../middlewares/auth.middleware");
const {
  createInstanceQr,
  getCurrentInstance,
  disconnectCurrentInstance,
  handleWebhook,
} = require("../controllers/whatsapp.controller");

// WEBHOOK route - MUST be public (no authMiddleware)
router.post("/webhook/:instanceName", handleWebhook);

// Protected routes
router.use(authMiddleware);

router.post("/create-instance", createInstanceQr);
router.get("/status", getCurrentInstance);
router.post("/disconnect", disconnectCurrentInstance);

module.exports = router;
