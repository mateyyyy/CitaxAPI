const express = require("express");
const cors = require("cors");
const pinoHttp = require("pino-http");
const logger = require("./utils/logger");
const authRoutes = require("./routes/auth.routes");
const appointmentsRoutes = require("./routes/appointments.routes");
const availabilityRoutes = require("./routes/availability.routes");
const configRoutes = require("./routes/config.routes");
const servicesRoutes = require("./routes/services.routes");
const professionalsRoutes = require("./routes/professionals.routes");
const notificationsRoutes = require("./routes/notifications.routes");
const whatsappRoutes = require("./routes/whatsapp.routes");
const superadminRoutes = require("./routes/superadmin.routes");
const publicRoutes = require("./routes/public.routes");
const clientsRoutes = require("./routes/clients.routes");

const app = express();

// Request logger (pino-http) — solo adjunta req.log, sin logging HTTP automático
app.use(
  pinoHttp({
    logger,
    autoLogging: false,
    serializers: {
      req: () => undefined,
      res: () => undefined,
    },
  }),
);

const allowedOrigins = new Set([
  "https://www.citax.com.ar",
  "https://citax.com.ar",
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:3000",
]);

const isAllowedCitaxOrigin = (origin) => {
  if (!origin) return true;
  if (allowedOrigins.has(origin)) return true;
  if (/^https:\/\/[a-z0-9-]+\.citax\.com\.ar$/i.test(origin)) return true;
  if (/^http:\/\/localhost:\d+$/i.test(origin)) return true;
  if (/^http:\/\/[a-z0-9-]+\.localhost:\d+$/i.test(origin)) return true;
  if (/^http:\/\/[a-z0-9-]+\.citax\.local:\d+$/i.test(origin)) return true;
  return false;
};

const corsOptions = {
  origin(origin, callback) {
    if (isAllowedCitaxOrigin(origin)) {
      return callback(null, true);
    }

    logger.warn(`CORS: origin rechazado | origin=${origin || "(none)"}`);
    return callback(new Error("Origin no permitido por CORS"));
  },
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "ngrok-skip-browser-warning",
  ],
  credentials: true,
};

// ── Webhook endpoints: server-to-server (Evolution API), sin restriccion CORS ─
// MUST be registered BEFORE global cors() middleware.
app.post(
  "/api/webhook",
  cors({ origin: true }),
  express.json({ limit: "5mb" }),
  require("./controllers/whatsapp.controller").handleWebhook,
);

// Whatsapp webhook by instanceName also needs bypass
app.post(
  "/api/whatsapp/webhook/:instanceName",
  cors({ origin: true }),
  express.json({ limit: "5mb" }),
  require("./controllers/whatsapp.controller").handleWebhook,
);

app.use(cors(corsOptions));
app.use(express.json({ limit: "5mb" }));

// Health
app.get("/", (req, res) =>
  res.json({ message: "Citax API is running", version: "1.0.0" }),
);
app.get("/health", (req, res) =>
  res.json({
    status: "ok",
    version: process.env.APP_VERSION || "local",
    model: process.env.GEMINI_MODEL || "not set",
  }),
);

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/appointments", appointmentsRoutes);
app.use("/api/availability", availabilityRoutes);
app.use("/api/config", configRoutes);
app.use("/api/services", servicesRoutes);
app.use("/api/professionals", professionalsRoutes);
app.use("/api/notifications", notificationsRoutes);
app.use("/api/whatsapp", whatsappRoutes);
app.use("/api/superadmin", superadminRoutes);
app.use("/api/public", publicRoutes);
app.use("/api/clients", clientsRoutes);

// Error handler
app.use((err, req, res, next) => {
  logger.error({ err, url: req.url, method: req.method }, "Unhandled error");
  res.status(500).json({ error: "Internal Server Error" });
});

module.exports = app;
