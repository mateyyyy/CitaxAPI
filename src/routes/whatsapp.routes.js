const express = require("express");
const router = express.Router();
const authMiddleware = require("../middlewares/auth.middleware");
const {
  createInstanceQr,
  getCurrentInstance,
  disconnectCurrentInstance,
} = require("../controllers/whatsapp.controller");

router.use(authMiddleware);

router.post("/create-instance", createInstanceQr);
router.get("/status", getCurrentInstance);
router.post("/disconnect", disconnectCurrentInstance);

module.exports = router;
